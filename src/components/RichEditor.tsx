'use client';

import { useRef, useState, useCallback } from 'react';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function RichEditor({ value, onChange, placeholder = '在此输入内容，支持粘贴图文...' }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [hasContent, setHasContent] = useState(!!value);

  const syncContent = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setHasContent(!!editorRef.current.textContent?.trim());
      onChange(html);
    }
  }, [onChange]);

  const execCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val || undefined);
    editorRef.current?.focus();
    syncContent();
  };

  // Set initial content
  const setInnerHTML = useCallback((node: HTMLDivElement | null) => {
    if (node && node.innerHTML !== value) {
      node.innerHTML = value;
      editorRef.current = node;
    }
  }, [value]);

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;
    const html = clipboardData.getData('text/html');
    const text = clipboardData.getData('text/plain');

    if (html) {
      document.execCommand('insertHTML', false, html);
    } else if (text) {
      document.execCommand('insertText', false, text);
    }
    syncContent();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        document.execCommand('insertHTML', false, `<img src="${data.data.url}" alt="${file.name}" style="max-width:100%;height:auto;" />`);
        syncContent();
      }
    } catch (err) {
      alert('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const insertVideo = () => {
    const url = prompt('请输入视频URL（支持MP4、YouTube、B站等）:');
    if (url) {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const vid = url.includes('watch?v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
        document.execCommand('insertHTML', false, `<iframe src="https://www.youtube.com/embed/${vid}" width="100%" height="400" frameborder="0" allowfullscreen style="max-width:100%;"></iframe>`);
      } else if (url.includes('bilibili.com')) {
        const bvid = url.split('/video/')[1]?.split('?')[0];
        if (bvid) {
          document.execCommand('insertHTML', false, `<iframe src="https://player.bilibili.com/player.html?bvid=${bvid}" width="100%" height="400" frameborder="0" allowfullscreen style="max-width:100%;"></iframe>`);
        }
      } else if (url.match(/\.(mp4|webm|ogg)$/i)) {
        document.execCommand('insertHTML', false, `<video src="${url}" controls style="max-width:100%;"></video>`);
      } else {
        document.execCommand('createLink', false, url);
      }
    }
    syncContent();
  };

  return (
    <div className="border border-brand-200 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-2 bg-brand-50 border-b border-brand-100 flex-wrap">
        <button
          type="button" onClick={() => execCmd('bold')}
          className="px-2.5 py-1.5 text-sm font-bold text-brand-600 hover:bg-white rounded transition-colors" title="加粗"
        >B</button>
        <button
          type="button" onClick={() => execCmd('italic')}
          className="px-2.5 py-1.5 text-sm italic text-brand-600 hover:bg-white rounded transition-colors" title="斜体"
        >I</button>
        <span className="w-px h-5 bg-brand-200 mx-1" />
        <button
          type="button" onClick={() => execCmd('formatBlock', 'h2')}
          className="px-2.5 py-1.5 text-xs font-bold text-brand-600 hover:bg-white rounded transition-colors" title="标题"
        >H2</button>
        <button
          type="button" onClick={() => execCmd('formatBlock', 'h3')}
          className="px-2.5 py-1.5 text-xs font-bold text-brand-600 hover:bg-white rounded transition-colors" title="小标题"
        >H3</button>
        <button
          type="button" onClick={() => execCmd('formatBlock', 'p')}
          className="px-2.5 py-1.5 text-xs text-brand-600 hover:bg-white rounded transition-colors" title="正文"
        >P</button>
        <span className="w-px h-5 bg-brand-200 mx-1" />
        <button
          type="button" onClick={() => {
            const url = prompt('链接地址:');
            if (url) execCmd('createLink', url);
          }}
          className="px-2.5 py-1.5 text-xs text-brand-600 hover:bg-white rounded transition-colors" title="插入链接"
        >🔗</button>
        <button
          type="button" onClick={() => execCmd('insertUnorderedList')}
          className="px-2.5 py-1.5 text-xs text-brand-600 hover:bg-white rounded transition-colors" title="无序列表"
        >•≡</button>
        <button
          type="button" onClick={() => execCmd('insertOrderedList')}
          className="px-2.5 py-1.5 text-xs text-brand-600 hover:bg-white rounded transition-colors" title="有序列表"
        >1≡</button>
        <button
          type="button" onClick={() => execCmd('formatBlock', 'blockquote')}
          className="px-2.5 py-1.5 text-xs text-brand-600 hover:bg-white rounded transition-colors" title="引用"
        >❝</button>
        <span className="w-px h-5 bg-brand-200 mx-1" />
        <label className="px-2.5 py-1.5 text-xs text-brand-600 hover:bg-white rounded transition-colors cursor-pointer" title="上传图片">
          {uploading ? '⏳' : '🖼'}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
        </label>
        <button
          type="button" onClick={insertVideo}
          className="px-2.5 py-1.5 text-xs text-brand-600 hover:bg-white rounded transition-colors" title="插入视频"
        >🎬</button>
      </div>

      {/* Editor */}
      <div
        ref={setInnerHTML}
        contentEditable
        suppressContentEditableWarning
        onInput={syncContent}
        onPaste={handlePaste}
        onBlur={syncContent}
        className="min-h-[300px] p-4 text-sm text-brand-800 focus:outline-none prose prose-sm max-w-none"
        data-placeholder={placeholder}
        style={{
          lineHeight: 1.8,
          wordBreak: 'break-word',
        }}
      />

      {/* Empty placeholder */}
      {!hasContent && (
        <div className="absolute pointer-events-none text-brand-300 text-sm px-4" style={{ marginTop: '-292px' }}>
          {placeholder}
        </div>
      )}

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #c4c4c4;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 12px 0;
        }
        [contenteditable] h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin: 20px 0 10px;
        }
        [contenteditable] h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin: 16px 0 8px;
        }
        [contenteditable] p {
          margin: 8px 0;
        }
        [contenteditable] blockquote {
          border-left: 3px solid #d1d1d1;
          padding-left: 16px;
          color: #6a6a6a;
          margin: 12px 0;
        }
        [contenteditable] ul, [contenteditable] ol {
          padding-left: 24px;
          margin: 8px 0;
        }
        [contenteditable] a {
          color: #c41e3a;
          text-decoration: underline;
        }
        [contenteditable] video, [contenteditable] iframe {
          max-width: 100%;
          border-radius: 8px;
          margin: 12px 0;
        }
      `}</style>
    </div>
  );
}
