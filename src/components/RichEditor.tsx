'use client';

import { useRef, useState, useCallback, useLayoutEffect, useEffect } from 'react';
import { compressImageFile } from '@/lib/clientImage';
import { uploadFileToBlob, INLINE_MAX_BYTES } from '@/lib/clientBlob';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** 当从文件导入时，回调通知父组件更新标题 */
  onTitleImported?: (title: string) => void;
}

/** 可选正文字号（px） */
const FONT_SIZES = [12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 32];
/** 站点正文默认字号（与前端 .article-body 一致，保证所见即所得） */
const DEFAULT_FONT_SIZE = 18;
/** 可承载字号的正文级块元素 */
const TEXT_BLOCK_SELECTOR = 'p,li,blockquote,td,th,figcaption,pre';
/** 段落级容器（用于定位光标所在块 / 选区涉及的块） */
const BLOCK_SELECTOR = 'p,div,section,li,blockquote,h1,h2,h3,h4,h5,h6,td,th,pre,figcaption';

/** 段落样式选项 */
const BLOCK_OPTIONS = [
  { value: 'p', label: '正文' },
  { value: 'h2', label: '大标题 H2' },
  { value: 'h3', label: '小标题 H3' },
  { value: 'blockquote', label: '引用' },
];

/** 媒体体积上限 */
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;          // 单张图片（含动图）
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;         // 单个视频
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;         // 导入文件上限 10MB
/** 超过该体积的导入文件先直传对象存储，再把 URL 交给服务端解析（绕开 4.5MB 请求体限制） */
const IMPORT_VIA_BLOB_BYTES = 4_000_000;
/** 导入整链路（上传 + 解析）超时保护：避免异常时按钮永久停在「导入中…」 */
const IMPORT_TIMEOUT_MS = 180_000;

/** 转义 HTML 属性值（文件名可能含引号/尖括号，避免破坏插入的标签） */
function attrEscape(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function RichEditor({ value, onChange, placeholder = '在此输入内容，支持粘贴图文...', onTitleImported }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [importing, setImporting] = useState(false);

  // ===== 格式 / 字号状态（用于工具栏高亮与回显）=====
  const [fmt, setFmt] = useState<{ bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; ul?: boolean; ol?: boolean; align?: string; block?: string }>({});
  const [currentFontSize, setCurrentFontSize] = useState<string>('');
  const [baseFontSize, setBaseFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [hint, setHint] = useState('');
  const hintTimer = useRef<number | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  // 标记是否由用户输入触发的变更（避免外部 value 同步覆盖编辑器内容）
  const composingRef = useRef(false);
  const lastValueRef = useRef(value);
  // isInitialized 标记首次挂载：第一次必须无条件设置 innerHTML
  const isInitializedRef = useRef(false);

  // 轻提示（替代 alert，避免打断编辑）
  const showHint = useCallback((msg: string) => {
    setHint(msg);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(''), 2200);
  }, []);

  // ⚡ 核心：只在初始化或外部真正改变 value 时才设置 innerHTML
  // 使用 useLayoutEffect 防止闪烁，且绝不在用户正在输入时覆盖
  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const isInitialized = isInitializedRef.current;
    // 初始化完成后，如果是用户自己刚刚输入引起的 value 变化，跳过（防止光标跳前）
    if (isInitialized && lastValueRef.current === value) return;
    // 标记已初始化
    isInitializedRef.current = true;
    // 外部真正改变了内容（如切换编辑文章），才覆盖
    lastValueRef.current = value;
    // 保存滚动位置，还原
    const scrollTop = isInitialized ? (el.closest('.overflow-y-auto')?.scrollTop ?? window.scrollY) : 0;
    el.innerHTML = value || '';
    // 光标移到末尾
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
    // 还原滚动位置，防止视窗跳动
    if (isInitialized) {
      requestAnimationFrame(() => {
        if (typeof scrollTop === 'number') window.scrollTo({ top: scrollTop });
      });
    }
  }, [value]);

  // 内容变更回调：只更新 ref，节流调用 onChange
  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastValueRef.current = html; // 标记这是用户输入触发的，防止 useLayoutEffect 覆盖
    onChange(html);
  }, [onChange]);

  // ===== 选区保存 / 恢复（下拉框会夺走焦点，必须先存档）=====
  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (savedRangeRef.current && sel) {
      try {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      } catch { /* 选区已失效，忽略 */ }
    }
  }, []);

  // 读取当前光标处格式状态（按钮高亮 / 下拉框回显）
  const getTargetBlocks = useCallback((): HTMLElement[] => {
    const editor = editorRef.current;
    if (!editor) return [];
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return [];
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return [];
    const all = Array.from(editor.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
    const hit = all.filter(el => {
      try { return range.intersectsNode(el); } catch { return false; }
    });
    // 只保留最内层块，避免父子重复处理
    const targets = hit.filter(el => !hit.some(o => o !== el && el.contains(o)));
    if (targets.length > 0) return targets;
    let node: Node | null = range.startContainer;
    while (node && node !== editor) {
      if (node.nodeType === 1 && (node as HTMLElement).matches(BLOCK_SELECTOR)) return [node as HTMLElement];
      node = node.parentNode;
    }
    return [];
  }, []);

  const syncFmt = useCallback(() => {
    const editor = editorRef.current;
    const sel = window.getSelection();
    if (!editor || !sel || sel.rangeCount === 0) return;
    if (!editor.contains(sel.getRangeAt(0).commonAncestorContainer)) return;
    const q = (c: string) => { try { return document.queryCommandState(c); } catch { return false; } };
    let block = '';
    try { block = String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, ''); } catch { /* ignore */ }
    setFmt({
      bold: q('bold'),
      italic: q('italic'),
      underline: q('underline'),
      strike: q('strikeThrough'),
      ul: q('insertUnorderedList'),
      ol: q('insertOrderedList'),
      align: q('justifyCenter') ? 'center' : q('justifyRight') ? 'right' : q('justifyFull') ? 'justify' : 'left',
      block: ['h1', 'h2', 'h3', 'h4', 'blockquote', 'pre'].includes(block) ? block : 'p',
    });

    // 回显当前块字号（只看内联样式，避免误判继承值）
    const blocks = getTargetBlocks();
    let node: HTMLElement | null = blocks[0] || null;
    let sizeStr = '';
    while (node && node !== editor) {
      if (node.style?.fontSize) { sizeStr = node.style.fontSize; break; }
      node = node.parentElement;
    }
    const num = sizeStr ? parseInt(sizeStr, 10) : 0;
    setCurrentFontSize(num && FONT_SIZES.includes(num) ? String(num) : '');
  }, [getTargetBlocks]);

  // 选区变化时持续存档 + 同步格式状态
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      const editor = editorRef.current;
      if (!sel || !editor || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (editor.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
        syncFmt();
      }
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, [syncFmt]);

  // ===== 字号工具 =====
  /** 清除某元素及其后代的内联字号（"默认"= 继承站点统一字号） */
  const clearInlineFontSize = (root: HTMLElement) => {
    root.querySelectorAll<HTMLElement>('[style]').forEach(el => {
      el.style.fontSize = '';
      if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
    });
    root.style.fontSize = '';
    if (!root.getAttribute('style')?.trim()) root.removeAttribute('style');
  };

  /** 展开 <font> 标签（公众号粘贴/旧内容常见，会被后端过滤导致字号失效） */
  const unwrapFontTags = (root: HTMLElement) => {
    root.querySelectorAll('font').forEach(f => {
      const parent = f.parentNode;
      if (!parent) return;
      while (f.firstChild) parent.insertBefore(f.firstChild, f);
      parent.removeChild(f);
    });
  };

  const hasDirectText = (el: HTMLElement) =>
    Array.from(el.childNodes).some(n => n.nodeType === 3 && (n.textContent || '').trim().length > 0);

  /** 仅对选中的文字设置字号（同一段内） */
  const wrapSelectionWithSize = (px: number): boolean => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return false;
    const span = document.createElement('span');
    span.style.fontSize = `${px}px`;
    try {
      range.surroundContents(span);
    } catch {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    // 保持选中，方便连续微调
    const after = document.createRange();
    after.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(after);
    savedRangeRef.current = after.cloneRange();
    return true;
  };

  /**
   * 应用字号
   * - 选中同一段内的文字 → 只作用于选中文字
   * - 选中跨段落 / 光标在段落内 → 作用于涉及的整个段落
   * - 值为空字符串 → 恢复默认（清除内联字号，继承站点字号）
   */
  const applyFontSize = useCallback((value: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreSelection();
    const px = value ? Number(value) : 0;
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    const blocks = getTargetBlocks();

    // 段内选中的连续文字：只改选中部分
    if (px > 0 && range && !range.collapsed && blocks.length <= 1) {
      if (wrapSelectionWithSize(px)) {
        emitChange();
        setCurrentFontSize(value);
        showHint(`选中文字已设为 ${px}px`);
        return;
      }
    }

    if (blocks.length === 0) {
      // 空编辑器 / 无块级结构：调整编辑器基础字号
      const next = px > 0 ? px : DEFAULT_FONT_SIZE;
      setBaseFontSize(next);
      setCurrentFontSize(px > 0 ? value : '');
      showHint(px > 0 ? `正文字号已设为 ${next}px` : '已恢复默认字号');
      return;
    }

    blocks.forEach(b => {
      if (px > 0) b.style.fontSize = `${px}px`;
      else clearInlineFontSize(b);
    });
    emitChange();
    syncFmt();
    setCurrentFontSize(value);
    showHint(px > 0 ? `${blocks.length} 个段落已设为 ${px}px` : '已恢复默认字号');
  }, [emitChange, getTargetBlocks, restoreSelection, showHint, syncFmt]);

  /** 一键统一全文正文字号（标题保持自身大小；不改动加粗/链接/图片） */
  const unifyFontSize = useCallback((value: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const px = value ? Number(value) : DEFAULT_FONT_SIZE;
    unwrapFontTags(editor);
    clearInlineFontSize(editor);
    // 正文级块统一字号
    editor.querySelectorAll<HTMLElement>(TEXT_BLOCK_SELECTOR).forEach(el => {
      el.style.fontSize = `${px}px`;
    });
    // 公众号导入常见：section/div 直接放文字、无 <p> 包裹
    editor.querySelectorAll<HTMLElement>('section,div').forEach(el => {
      if (hasDirectText(el)) el.style.fontSize = `${px}px`;
    });
    setBaseFontSize(px);
    setCurrentFontSize(String(px));
    emitChange();
    showHint(`全文正文字号已统一为 ${px}px`);
  }, [emitChange, showHint]);

  // 执行编辑命令（不触发 DOM 重置）
  const exec = useCallback((cmd: string, val?: string) => {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand(cmd, false, val);
    emitChange();
    syncFmt();
  }, [emitChange, restoreSelection, syncFmt]);

  // 执行对齐命令（用 styleWithCSS 输出 style="text-align:..."，
  // 避免输出 align 属性被后端 sanitize 过滤掉）
  const execAlign = useCallback((cmd: string) => {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(cmd, false);
    emitChange();
    syncFmt();
  }, [emitChange, restoreSelection, syncFmt]);

  // 段落样式（正文 / H2 / H3 / 引用）
  const applyBlockFormat = useCallback((tag: string) => {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand('styleWithCSS', false, 'false');
    document.execCommand('formatBlock', false, `<${tag}>`);
    emitChange();
    syncFmt();
  }, [emitChange, restoreSelection, syncFmt]);

  // 插入 HTML（不丢失光标）
  const insertHtmlAtCursor = useCallback((html: string) => {
    restoreSelection();
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    emitChange();
  }, [emitChange, restoreSelection]);

  // 插入链接
  const insertLink = useCallback(() => {
    const sel = window.getSelection();
    const selectedText = sel && !sel.isCollapsed ? sel.toString() : '';
    const url = prompt('链接地址:', 'https://');
    if (!url) return;
    if (selectedText) {
      exec('createLink', url);
    } else {
      insertHtmlAtCursor(`<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
    }
  }, [exec, insertHtmlAtCursor]);

  /**
   * 解析媒体地址：小文件走 /api/admin/upload 转 base64 内嵌（正文自包含），
   * 大文件 / 视频走 Vercel Blob 对象存储（绕过 4.5MB 请求体上限）
   */
  const resolveMediaUrl = async (file: File, prefix: string, allowInline: boolean): Promise<string> => {
    if (!allowInline || file.size > INLINE_MAX_BYTES) {
      return await uploadFileToBlob(file, prefix, setUploadPct);
    }
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    let data: any = null;
    try { data = await res.json(); } catch { /* 非 JSON（413/HTML） */ }
    if (!res.ok || !data?.success) {
      // base64 通道失败（体积/超时等）→ 自动改走对象存储兜底，避免用户重试
      return await uploadFileToBlob(file, prefix, setUploadPct);
    }
    return data.data.url as string;
  };

  // 上传图片（含 GIF 动图）：先客户端压缩，小图内嵌、大图/大动图存对象存储
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;
    if (rawFile.size > MAX_IMAGE_BYTES) {
      alert(`图片过大（${(rawFile.size / 1024 / 1024).toFixed(1)}MB），单张上限 ${MAX_IMAGE_BYTES / 1024 / 1024}MB`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    setUploadPct(0);
    try {
      const file = await compressImageFile(rawFile);
      const url = await resolveMediaUrl(file, 'image', true);
      insertHtmlAtCursor(`<img src="${url}" alt="${attrEscape(file.name)}" style="max-width:100%;height:auto;margin:12px 0;display:block;margin-left:auto;margin-right:auto;" />`);
    } catch (err: any) {
      alert(`图片上传失败：${err?.message || '请检查网络后重试'}`);
    } finally {
      setUploading(false);
      setUploadPct(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 上传视频（MP4 / MOV / WebM 等大文件，直传对象存储）
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|ogv|avi)$/i.test(file.name);
    if (!isVideo) {
      alert('请选择视频文件（MP4 / MOV / WebM / OGG）');
      if (videoFileRef.current) videoFileRef.current.value = '';
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      alert(`视频过大（${(file.size / 1024 / 1024).toFixed(1)}MB），单个上限 ${MAX_VIDEO_BYTES / 1024 / 1024}MB`);
      if (videoFileRef.current) videoFileRef.current.value = '';
      return;
    }
    setUploadingVideo(true);
    setUploadPct(0);
    try {
      const url = await uploadFileToBlob(file, 'video', setUploadPct);
      insertHtmlAtCursor(
        `<video src="${url}" controls playsinline preload="metadata" style="width:100%;max-width:100%;margin:12px 0;display:block;background:#000;"></video>`
      );
      showHint(`视频已插入（${(file.size / 1024 / 1024).toFixed(1)}MB），保存后前台即可播放`);
    } catch (err: any) {
      alert(`视频上传失败：${err?.message || '请检查网络后重试'}`);
    } finally {
      setUploadingVideo(false);
      setUploadPct(0);
      if (videoFileRef.current) videoFileRef.current.value = '';
    }
  };

  // 导入文件（Word / Markdown / TXT / HTML），上限 10MB
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      alert(`文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），导入上限 ${MAX_IMPORT_BYTES / 1024 / 1024}MB。请压缩文档后重试，或拆分后分批导入。`);
      if (importFileRef.current) importFileRef.current.value = '';
      return;
    }
    setImporting(true);
    setUploadPct(0);
    let timer: ReturnType<typeof setTimeout> | null = null;
    try {
      // 网络阶段（直传 + 服务端解析）包一层超时，任何一环异常都能给出明确提示而不是无限转圈
      const request = (async () => {
        let res: Response;
        if (file.size > IMPORT_VIA_BLOB_BYTES) {
          // 大文件：浏览器直传对象存储（绕开 Vercel 4.5MB 请求体上限），服务端再按 URL 拉取解析
          const url = await uploadFileToBlob(file, 'doc', setUploadPct);
          res = await fetch('/api/admin/import-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, name: file.name }),
          });
        } else {
          const fd = new FormData();
          fd.append('file', file);
          res = await fetch('/api/admin/import-file', { method: 'POST', body: fd });
        }
        let data: any = null;
        try { data = await res.json(); } catch { /* 413/HTML 等非 JSON */ }
        return { res, data };
      })();

      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('__IMPORT_TIMEOUT__')), IMPORT_TIMEOUT_MS);
      });

      const { res, data } = await Promise.race([request, timeout]);
      if (!res.ok || !data?.success) {
        alert((data?.error || `导入失败（HTTP ${res.status}）`) + (res.status === 413 ? '：文件过大，请压缩文档后重试' : ''));
        return;
      }
      const { title, content } = data.data;
      // 是否要替换当前内容
      const currentContent = editorRef.current?.innerHTML || '';
      if (currentContent.trim() && currentContent !== '<br>') {
        const ok = confirm(`当前编辑器已有内容，是否用「${file.name}」的内容替换？`);
        if (!ok) return;
      }
      // 注入内容到编辑器
      if (editorRef.current) {
        editorRef.current.innerHTML = content;
        lastValueRef.current = content;
        // 导入内容常自带杂乱字号（公众号/Word 残留），统一为站点正文字号
        unifyFontSize(currentFontSize || String(baseFontSize));
      }
      // 如果父组件想要获取标题
      if (title && onTitleImported) {
        onTitleImported(title);
      }
      const warn: string[] = Array.isArray(data.data.warnings) ? data.data.warnings.filter(Boolean) : [];
      if (data.data.imageCount > 0) {
        alert(`✅ 导入成功！文件包含 ${data.data.imageCount} 张图片，已转为内嵌图片显示。`);
      } else if (warn.length > 0) {
        alert(`⚠️ 导入完成，但未提取到图片：\n${warn.join('\n')}`);
      }
    } catch (err: any) {
      if (err?.message === '__IMPORT_TIMEOUT__') {
        alert(`导入超时（已等待 ${IMPORT_TIMEOUT_MS / 1000} 秒仍未完成）。\n请压缩文档体积或拆分后分批导入，也可稍后重试。`);
      } else {
        alert(`导入失败：${err?.message || '请检查文件格式与网络后重试'}`);
      }
    } finally {
      if (timer) clearTimeout(timer);
      setImporting(false);
      setUploadPct(0);
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  // 插入外链视频（YouTube / B站 / 直链 MP4/MOV/WebM）
  const insertVideo = useCallback(() => {
    const url = prompt('请输入视频链接（支持 YouTube / B站 / 直链 MP4、MOV、WebM）:');
    if (!url) return;
    let html = '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const vid = url.includes('watch?v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
      html = `<iframe src="https://www.youtube.com/embed/${vid}" width="100%" height="400" frameborder="0" allowfullscreen style="max-width:100%;margin:12px 0;"></iframe>`;
    } else if (url.includes('bilibili.com')) {
      const bvid = url.split('/video/')[1]?.split('?')[0];
      if (bvid) html = `<iframe src="https://player.bilibili.com/player.html?bvid=${bvid}" width="100%" height="400" frameborder="0" allowfullscreen style="max-width:100%;margin:12px 0;"></iframe>`;
    } else if (url.match(/\.(mp4|mov|m4v|webm|ogv|ogg|avi)(\?.*)?$/i)) {
      html = `<video src="${url}" controls playsinline preload="metadata" style="width:100%;max-width:100%;margin:12px 0;display:block;background:#000;"></video>`;
    } else {
      exec('createLink', url);
      return;
    }
    insertHtmlAtCursor(html);
  }, [exec, insertHtmlAtCursor]);

  // 将 blob: URL 转为 base64 data URI
  const blobToBase64 = async (blobUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(blobUrl);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  // 粘贴处理（保留基本格式，清理脏 HTML；把 blob: URL 图片转为 base64）
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    // 优先处理文件粘贴（直接粘贴图片文件）
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (imageItem) {
      const rawFile = imageItem.getAsFile();
      if (rawFile) {
        setUploading(true);
        setUploadPct(0);
        try {
          const file = await compressImageFile(rawFile);
          const url = await resolveMediaUrl(file, 'image', true);
          insertHtmlAtCursor(`<img src="${url}" alt="粘贴图片" style="max-width:100%;height:auto;margin:12px 0;display:block;margin-left:auto;margin-right:auto;" />`);
        } catch (err: any) {
          alert(`图片上传失败：${err?.message || '请检查网络后重试'}`);
        } finally {
          setUploading(false);
          setUploadPct(0);
        }
        return;
      }
    }

    if (html) {
      let cleaned = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/\s(on\w+)=/gi, ' data-removed=');

      // 去掉外来的字号/字体/行高与 class/id，保持站内正文统一（避免被外部样式与 Tailwind 工具类污染）
      cleaned = cleaned
        .replace(/<font[^>]*>/gi, '')
        .replace(/<\/font>/gi, '')
        .replace(/style\s*=\s*(?:"([^"]*)"|'([^']*)')/gi, (_m, d, s) => {
          const css = String(d ?? s ?? '');
          const kept = css
            .split(';')
            .map(x => x.trim())
            .filter(x => x && !/^(font-size|font-family|line-height|font)\s*:/i.test(x));
          return kept.length ? `style="${kept.join('; ')}"` : '';
        })
        .replace(/\s(class|id)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');

      // 检测 blob: URL 并转为 base64
      const blobMatches = Array.from(cleaned.matchAll(/src\s*=\s*["'](blob:[^"']+)["']/gi));
      if (blobMatches.length > 0) {
        for (const match of blobMatches) {
          const blobUrl = match[1];
          const base64 = await blobToBase64(blobUrl);
          if (base64) {
            cleaned = cleaned.replace(blobUrl, base64);
          } else {
            // 无法转换的 blob 图片直接移除（避免保存后显示损坏图片）
            cleaned = cleaned.replace(new RegExp(`<img[^>]*src=["']${blobUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'gi'), '');
          }
        }
      }

      document.execCommand('insertHTML', false, cleaned);
    } else if (text) {
      document.execCommand('insertText', false, text);
    }
    emitChange();
  }, [emitChange, insertHtmlAtCursor]);

  return (
    <div className="border border-brand-200 rounded-lg">
      {/* ====== 工具栏 ====== */}
      {/* 悬浮工具栏：长文编辑时滚动到任意位置都可插图/调格式，无需回到顶部 */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-brand-50 border-b border-brand-100 flex-wrap sticky top-0 z-30 rounded-t-lg shadow-sm">
        <Btn onClick={() => exec('bold')} title="加粗（Ctrl+B）" active={fmt.bold}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h5.5a3.5 3.5 0 010 7H7V5zm0 8h6a3.5 3.5 0 010 7H7v-7z"/></svg>
        </Btn>
        <Btn onClick={() => exec('italic')} title="斜体（Ctrl+I）" active={fmt.italic}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 5h6M14 5l-4 14m-2 0h6"/></svg>
        </Btn>
        <Btn onClick={() => exec('underline')} title="下划线（Ctrl+U）" active={fmt.underline}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16"/></svg>
        </Btn>
        <Btn onClick={() => exec('strikeThrough')} title="删除线" active={fmt.strike}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M8 8a4 3 0 118 0M16 16a4 3 0 11-8 0"/></svg>
        </Btn>

        <Divider />

        {/* 段落样式 */}
        <select
          value={fmt.block || 'p'}
          onChange={(e) => applyBlockFormat(e.target.value)}
          title="段落样式（标题/正文/引用）"
          className="px-1.5 py-1 rounded text-xs border border-brand-200 bg-white text-brand-700 hover:border-brand-400 focus:outline-none focus:border-brand-900 cursor-pointer"
        >
          {BLOCK_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* 字号 */}
        <select
          value={currentFontSize}
          onChange={(e) => applyFontSize(e.target.value)}
          title="正文字号：选中文字只改选中部分，选中段落/光标所在段落则改整段"
          className="px-1.5 py-1 rounded text-xs border border-brand-200 bg-white text-brand-700 hover:border-brand-400 focus:outline-none focus:border-brand-900 cursor-pointer"
        >
          <option value="">默认</option>
          {FONT_SIZES.map(s => (
            <option key={s} value={String(s)}>{s}px</option>
          ))}
        </select>

        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); unifyFontSize(currentFontSize); }}
          title="把全文正文字号统一为左侧所选字号（标题不受影响）"
          className="px-2 py-1 rounded text-xs font-medium border border-brand-200 bg-white text-brand-700 hover:border-brand-900 hover:text-brand-900 transition-colors select-none"
        >
          统一字号
        </button>

        <Divider />

        {/* 对齐：左 / 中 / 右 / 两端 */}
        <Btn onClick={() => execAlign('justifyLeft')} title="左对齐" active={fmt.align === 'left'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h10M4 18h14"/></svg>
        </Btn>
        <Btn onClick={() => execAlign('justifyCenter')} title="居中对齐" active={fmt.align === 'center'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M7 12h10M5 18h14"/></svg>
        </Btn>
        <Btn onClick={() => execAlign('justifyRight')} title="右对齐" active={fmt.align === 'right'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M10 12h10M6 18h14"/></svg>
        </Btn>
        <Btn onClick={() => execAlign('justifyFull')} title="两端对齐" active={fmt.align === 'justify'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </Btn>

        <Divider />

        <Btn onClick={() => exec('insertUnorderedList')} title="无序列表" active={fmt.ul}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="5" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="5" cy="19" r="2"/><path d="M10 5h10M10 12h10M10 19h10"/></svg>
        </Btn>
        <Btn onClick={() => exec('insertOrderedList')} title="有序列表" active={fmt.ol}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><text x="3" y="8" fontSize="10">1.</text><text x="3" y="15" fontSize="10">2.</text><text x="3" y="22" fontSize="10">3.</text><path d="M11 6h10M11 13h10M11 20h10"/></svg>
        </Btn>
        <Btn onClick={() => applyBlockFormat(fmt.block === 'blockquote' ? 'p' : 'blockquote')} title="引用" active={fmt.block === 'blockquote'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5H3v7h4c0 3-2 5-4 5v4zm8 0c3 0 7-1 7-8V5h-7v7h4c0 3-2 5-4 5v4z"/></svg>
        </Btn>

        <Divider />

        <Btn onClick={() => exec('insertHorizontalRule')} title="插入分割线">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12h16"/></svg>
        </Btn>
        <Btn onClick={() => exec('removeFormat')} title="清除格式（含字号，恢复默认）">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 5h12M9 5l3 14M6 19h8"/><path d="M17 14l4 4m0-4l-4 4"/></svg>
        </Btn>

        <Divider />

        <Btn onClick={() => exec('undo')} title="撤销（Ctrl+Z）">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-5"/></svg>
        </Btn>
        <Btn onClick={() => exec('redo')} title="重做（Ctrl+Shift+Z）">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h5"/></svg>
        </Btn>

        <Divider />

        <Btn onClick={insertLink} title="插入链接">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        </Btn>

        {/* 图片上传（含 GIF 动图；过大自动转对象存储） */}
        <label
          className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer select-none ${uploading ? 'text-brand-300' : 'text-brand-600 hover:bg-white hover:text-brand-900'}`}
          title="上传图片（JPG / PNG / GIF 动图 / WebP / SVG；大图自动转对象存储）"
        >
          {uploading ? (
            uploadPct > 0
              ? <span className="text-[11px] tabular-nums">{uploadPct}%</span>
              : <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif,image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
        </label>

        {/* 视频上传（MP4 / MOV / WebM，大文件直传对象存储） */}
        <label
          className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer select-none ${uploadingVideo ? 'text-brand-300' : 'text-brand-600 hover:bg-white hover:text-brand-900'}`}
          title="上传视频文件（MP4 / MOV / WebM / OGG，支持大文件）"
        >
          {uploadingVideo ? (
            uploadPct > 0
              ? <span className="text-[11px] tabular-nums">{uploadPct}%</span>
              : <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="13" height="14" rx="2"/><path d="M15 10.5l6-3.5v10l-6-3.5"/></svg>
          )}
          <input ref={videoFileRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/ogg,video/*,.mp4,.mov,.m4v,.webm,.ogv" onChange={handleVideoUpload} className="hidden" disabled={uploadingVideo} />
        </label>

        <Btn onClick={insertVideo} title="插入视频链接（YouTube / B站 / 直链 MP4、MOV）">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </Btn>

        <Divider />

        {/* 文件导入（Word / MD / TXT / HTML） */}
        <label
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer select-none ${importing ? 'text-brand-300' : 'text-brand-600 hover:bg-white hover:text-brand-900'}`}
          title="从文件导入正文（支持 .docx .md .txt .html）"
        >
          {importing ? (
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          )}
          <span className="hidden sm:inline">{importing ? '导入中...' : '导入文件'}</span>
          <input
            ref={importFileRef}
            type="file"
            accept=".docx,.doc,.md,.txt,.html,.htm"
            onChange={handleFileImport}
            className="hidden"
            disabled={importing}
          />
        </label>

        {/* 操作反馈（替代打断式弹窗） */}
        {hint && <span className="ml-auto text-xs text-brand-500">{hint}</span>}
      </div>

      {/* ====== 编辑区域 ====== */}
      {/* 
        ⚠️ 关键：不使用 dangerouslySetInnerHTML，只用 ref 控制内容
        dangerouslySetInnerHTML + contentEditable 会导致每次 re-render 重置 DOM，光标和滚动位置丢失
      */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onPaste={handlePaste}
        onBlur={emitChange}
        onKeyUp={syncFmt}
        onMouseUp={syncFmt}
        className="editor-area min-h-[320px] p-4 text-brand-800 focus:outline-none"
        data-placeholder={placeholder}
        style={{ lineHeight: 1.85, wordBreak: 'break-word', fontSize: `${baseFontSize}px` }}
      />

      {/* ====== 样式 ====== */}
      <style jsx global>{`
        .editor-area:empty:before {
          content: attr(data-placeholder);
          color: #b0b0b0;
          pointer-events: none;
        }
        .editor-area img {
          max-width: 100% !important;
          height: auto !important;
          border-radius: 8px;
          margin: 12px 0;
          display: block;
        }
        .editor-area h2 { font-size: 1.5rem; font-weight: 700; margin: 24px 0 12px; color: #1a1a1a; }
        .editor-area h3 { font-size: 1.2rem; font-weight: 600; margin: 20px 0 10px; color: #1a1a1a; }
        .editor-area p { margin: 8px 0; }
        .editor-area blockquote {
          border-left: 3px solid #c41e3a;
          padding: 8px 16px;
          margin: 16px 0;
          color: #555;
          background: #fdf5f6;
          border-radius: 0 6px 6px 0;
        }
        .editor-area ul, .editor-area ol { padding-left: 24px; margin: 8px 0; }
        .editor-area li { margin: 4px 0; }
        .editor-area a { color: #c41e3a; text-decoration: underline; }
        .editor-area video, .editor-area iframe { max-width: 100%; border-radius: 8px; margin: 12px 0; }
        .editor-area table { border-collapse: collapse; width: 100%; margin: 12px 0; }
        .editor-area td, .editor-area th { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        .editor-area [style*="text-align:center"] { text-align: center; }
        .editor-area [style*="text-align:right"] { text-align: right; }
      `}</style>
    </div>
  );
}

/** 工具栏小按钮 */
function Btn({ children, onClick, title, active }: { children: React.ReactNode; onClick: () => void; title: string; active?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // 阻止 mousedown 触发编辑区失焦，保持光标位置
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`px-2 py-1 rounded text-xs font-medium transition-colors select-none ${
        active ? 'bg-brand-900 text-white' : 'text-brand-600 hover:bg-white hover:text-brand-900'
      }`}
    >
      {children}
    </button>
  );
}

/** 分隔线 */
function Divider() {
  return <span className="w-px h-5 bg-brand-200 mx-0.5" />;
}
