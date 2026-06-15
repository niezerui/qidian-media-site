'use client';

import { useState, useEffect } from 'react';

interface ShareBarProps {
  title: string;
  summary?: string;
  coverImage?: string;
  slug: string;
}

export default function ShareBar({ title, summary, coverImage, slug }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [showWechatTip, setShowWechatTip] = useState(false);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedSummary = encodeURIComponent(summary || title);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = currentUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLinks = [
    {
      name: '微博',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.098 20C5.65 20 2 17.748 2 14.965c0-1.496 1.032-3.235 2.813-4.866C6.785 8.223 9.007 7.5 10.9 7.5c.448 0 .887.04 1.313.116.226-.54.484-1.057.764-1.54C13.867 4.26 15.42 3 17.4 3c2.762 0 4.6 2.068 4.6 5.102 0 .26-.02.52-.06.775C23.13 9.44 24 10.38 24 11.5c0 2.21-2.73 4-6.1 4-.445 0-.88-.035-1.3-.1-.51.774-1.17 1.44-1.95 1.95C13.388 19.38 11.7 20 10.098 20zm.652-10.5c-2.51 0-5.25 1.546-5.25 3.75 0 1.924 1.87 3.25 4.25 3.25 2.51 0 5.25-1.546 5.25-3.75 0-1.924-1.87-3.25-4.25-3.25z"/>
        </svg>
      ),
      url: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedTitle}`,
      color: '#e6162d',
    },
    {
      name: 'X',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      color: '#000',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 py-5 border-t border-b my-6" style={{ borderColor: 'var(--c-border)' }}>
      <span className="text-sm font-medium" style={{ color: 'var(--c-text-2)' }}>分享：</span>

      {/* 微信（显示提示二维码占位符） */}
      <div className="relative">
        <button
          onClick={() => setShowWechatTip(!showWechatTip)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          style={{ backgroundColor: '#07c160', color: 'white' }}
          title="分享到微信"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01.182-.556C23.024 18.21 24 16.705 24 14.995c0-3.232-2.922-5.892-7.062-6.137zm-2.64 3.449c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm5.4 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z"/>
          </svg>
          微信
        </button>

        {/* 微信分享提示气泡 */}
        {showWechatTip && (
          <div
            className="absolute left-0 top-full mt-2 w-56 p-3 rounded-xl shadow-lg z-50 text-xs"
            style={{ backgroundColor: 'white', border: '1px solid var(--c-border)', color: 'var(--c-text-2)' }}
          >
            <p className="font-medium mb-1.5" style={{ color: 'var(--c-text)' }}>分享到微信</p>
            <p className="leading-relaxed mb-2">在微信中，点击右上角 ⋯ 菜单，选择「发送给朋友」或「分享到朋友圈」</p>
            <p className="leading-relaxed">或复制链接，在微信对话框中粘贴发送</p>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(); setShowWechatTip(false); }}
              className="mt-2 w-full py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ backgroundColor: '#07c160' }}
            >
              复制链接
            </button>
          </div>
        )}
      </div>

      {/* 其他分享平台 */}
      {shareLinks.map(link => (
        <a
          key={link.name}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: link.color }}
        >
          {link.icon}
          {link.name}
        </a>
      ))}

      {/* 复制链接 */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
        style={{
          borderColor: copied ? '#22c55e' : 'var(--c-border)',
          color: copied ? '#22c55e' : 'var(--c-text-2)',
          backgroundColor: copied ? '#f0fdf4' : 'transparent',
        }}
      >
        {copied ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            已复制
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            复制链接
          </>
        )}
      </button>
    </div>
  );
}
