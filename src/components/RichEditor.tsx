'use client';

import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichEditor({ value, onChange, placeholder = '在此输入内容，支持粘贴图文...' }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // 标记是否由用户输入触发的变更（避免外部 value 同步覆盖编辑器内容）
  const composingRef = useRef(false);
  const lastValueRef = useRef(value);

  // ⚡ 核心修复：只在初始化或外部真正改变 value 时才设置 innerHTML
  // 使用 useLayoutEffect 防止闪烁，且绝不在用户正在输入时覆盖
  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // 如果是用户自己刚刚输入引起的 value 变化，跳过（防止光标跳前）
    if (lastValueRef.current === value) return;
    // 外部真正改变了内容（如切换编辑文章），才覆盖
    lastValueRef.current = value;
    // 保存滚动位置，还原
    const scrollTop = el.closest('.overflow-y-auto')?.scrollTop ?? window.scrollY;
    el.innerHTML = value || '';
    // 光标移到末尾
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
    // 还原滚动位置，防止视窗跳动
    requestAnimationFrame(() => {
      if (typeof scrollTop === 'number') window.scrollTo({ top: scrollTop });
    });
  }, [value]);

  // 内容变更回调：只更新 ref，节流调用 onChange
  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastValueRef.current = html; // 标记这是用户输入触发的，防止 useLayoutEffect 覆盖
    onChange(html);
  }, [onChange]);

  // 执行编辑命令（不触发 DOM 重置）
  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emitChange();
  }, [emitChange]);

  // 插入 HTML（不丢失光标）
  const insertHtmlAtCursor = useCallback((html: string) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    emitChange();
  }, [emitChange]);

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

  // 上传图片
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) { alert(data.error || '上传失败'); return; }
      insertHtmlAtCursor(`<img src="${data.data.url}" alt="${file.name}" style="max-width:100%;height:auto;border-radius:8px;margin:12px 0;" />`);
    } catch {
      alert('图片上传失败，请检查网络');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 插入视频
  const insertVideo = useCallback(() => {
    const url = prompt('请输入视频URL（MP4 / YouTube / B站）:');
    if (!url) return;
    let html = '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const vid = url.includes('watch?v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
      html = `<iframe src="https://www.youtube.com/embed/${vid}" width="100%" height="400" frameborder="0" allowfullscreen style="max-width:100%;border-radius:8px;margin:12px 0;"></iframe>`;
    } else if (url.includes('bilibili.com')) {
      const bvid = url.split('/video/')[1]?.split('?')[0];
      if (bvid) html = `<iframe src="https://player.bilibili.com/player.html?bvid=${bvid}" width="100%" height="400" frameborder="0" allowfullscreen style="max-width:100%;border-radius:8px;margin:12px 0;"></iframe>`;
    } else if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
      html = `<video src="${url}" controls style="max-width:100%;border-radius:8px;margin:12px 0;"></video>`;
    } else {
      exec('createLink', url);
      return;
    }
    insertHtmlAtCursor(html);
  }, [exec, insertHtmlAtCursor]);

  // 粘贴处理（保留基本格式，清理脏 HTML）
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) {
      const cleaned = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/\s(on\w+)=/gi, ' data-removed=');
      document.execCommand('insertHTML', false, cleaned);
    } else if (text) {
      document.execCommand('insertText', false, text);
    }
    emitChange();
  }, [emitChange]);

  return (
    <div className="border border-brand-200 rounded-lg overflow-hidden">
      {/* ====== 工具栏 ====== */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-brand-50 border-b border-brand-100 flex-wrap sticky top-0 z-10">
        <Btn onClick={() => exec('bold')} title="加粗">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h5.5a3.5 3.5 0 010 7H7V5zm0 8h6a3.5 3.5 0 010 7H7v-7z"/></svg>
        </Btn>
        <Btn onClick={() => exec('italic')} title="斜体">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 5h6M14 5l-4 14m-2 0h6"/></svg>
        </Btn>
        <Btn onClick={() => exec('underline')} title="下划线">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 3v7a6 6 0 006 6 6 6 0 006-6V3M4 21h16"/></svg>
        </Btn>

        <Divider />

        <Btn onClick={() => exec('formatBlock', '<h2>')} title="大标题">H2</Btn>
        <Btn onClick={() => exec('formatBlock', '<h3>')} title="小标题">H3</Btn>
        <Btn onClick={() => exec('formatBlock', '<p>')} title="正文">¶</Btn>

        <Divider />

        <Btn onClick={() => exec('insertUnorderedList')} title="无序列表">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="5" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="5" cy="19" r="2"/><path d="M10 5h10M10 12h10M10 19h10"/></svg>
        </Btn>
        <Btn onClick={() => exec('insertOrderedList')} title="有序列表">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><text x="3" y="8" fontSize="10">1.</text><text x="3" y="15" fontSize="10">2.</text><text x="3" y="22" fontSize="10">3.</text><path d="M11 6h10M11 13h10M11 20h10"/></svg>
        </Btn>
        <Btn onClick={() => exec('formatBlock', '<blockquote>')} title="引用">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5H3v7h4c0 3-2 5-4 5v4zm8 0c3 0 7-1 7-8V5h-7v7h4c0 3-2 5-4 5v4z"/></svg>
        </Btn>

        <Divider />

        <Btn onClick={insertLink} title="插入链接">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        </Btn>

        <Divider />

        {/* 图片上传 */}
        <label
          className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer select-none ${uploading ? 'text-brand-300' : 'text-brand-600 hover:bg-white hover:text-brand-900'}`}
          title="上传图片"
        >
          {uploading ? (
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
        </label>

        <Btn onClick={insertVideo} title="插入视频">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </Btn>
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
        className="editor-area min-h-[320px] p-4 text-sm text-brand-800 focus:outline-none"
        data-placeholder={placeholder}
        style={{ lineHeight: 1.85, wordBreak: 'break-word' }}
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
        .editor-area h2 { font-size: 1.3rem; font-weight: 700; margin: 24px 0 12px; color: #1a1a1a; }
        .editor-area h3 { font-size: 1.1rem; font-weight: 600; margin: 20px 0 10px; color: #1a1a1a; }
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
function Btn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        // 阻止 mousedown 触发编辑区失焦，保持光标位置
        e.preventDefault();
        onClick();
      }}
      title={title}
      className="px-2 py-1 rounded text-xs font-medium transition-colors select-none text-brand-600 hover:bg-white hover:text-brand-900"
    >
      {children}
    </button>
  );
}

/** 分隔线 */
function Divider() {
  return <span className="w-px h-5 bg-brand-200 mx-0.5" />;
}
