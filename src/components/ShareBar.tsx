'use client';

import { useState, useEffect, useRef } from 'react';

interface ShareBarProps {
  title: string;
  summary?: string;
  /** 封面图片（非 data:URI，必须是公网 http/https URL，才能被微信预览） */
  coverImage?: string;
  slug: string;
}

declare global {
  interface Window {
    wx?: any;
  }
}

export default function ShareBar({ title, summary, coverImage, slug }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isWechat, setIsWechat] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [wxSdkFailed, setWxSdkFailed] = useState(false);
  const wxInitialized = useRef(false);

  useEffect(() => {
    const url = window.location.href;
    setCurrentUrl(url);

    // 检测是否在微信浏览器内
    const ua = navigator.userAgent.toLowerCase();
    const inWechat = ua.includes('micromessenger');
    setIsWechat(inWechat);

    // 检测是否支持原生分享 API（手机浏览器）
    setCanNativeShare(typeof navigator.share === 'function');

    // 微信 JS-SDK 初始化
    if (inWechat && !wxInitialized.current) {
      wxInitialized.current = true;
      initWechatShare(url, title, summary || title, coverImage);
    }
  }, [title, summary, coverImage]);

  // 初始化微信 JS-SDK，配置自定义分享卡片
  async function initWechatShare(url: string, shareTitle: string, shareDesc: string, shareImg?: string) {
    try {
      // 动态加载微信 JS-SDK
      if (!window.wx) {
        await loadScript('https://res.wx.qq.com/open/js/jweixin-1.6.0.js');
      }
      // 获取签名
      const res = await fetch(`/api/wechat-sign?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!data.success) {
        // needsConfig 表示后台尚未配置公众号 API，JS-SDK 无法使用
        // 此时依赖页面 OG 标签（标题+摘要+封面）被微信爬虫抓取
        if (data.needsConfig) setWxSdkFailed(true);
        return;
      }
      const { appId, timestamp, nonceStr, signature } = data.data;

      // 计算 og-image 绝对 URL（可被微信爬虫访问）
      const ogImgUrl = `https://www.qidianyanjiushe.com/api/og-image?slug=${encodeURIComponent(slug)}`;
      const imgUrl = shareImg || ogImgUrl;

      window.wx.config({
        debug: false,
        appId,
        timestamp,
        nonceStr,
        signature,
        jsApiList: [
          'updateAppMessageShareData',
          'updateTimelineShareData',
          'onMenuShareAppMessage',
          'onMenuShareTimeline',
        ],
      });

      window.wx.ready(() => {
        const shareData = {
          title: shareTitle,
          desc: shareDesc,
          link: url,
          imgUrl,
        };
        // 分享给朋友
        window.wx.updateAppMessageShareData?.(shareData);
        // 分享到朋友圈
        window.wx.updateTimelineShareData?.({
          title: shareTitle,
          link: url,
          imgUrl,
        });
        // 兼容旧版
        window.wx.onMenuShareAppMessage?.(shareData);
        window.wx.onMenuShareTimeline?.({
          title: shareTitle,
          link: url,
          imgUrl,
        });
      });

      window.wx.error(() => {
        setWxSdkFailed(true);
      });
    } catch (e) {
      // 静默失败，不影响用户体验
    }
  }

  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // 系统原生分享（手机浏览器）
  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title,
        text: summary || title,
        url: currentUrl,
      });
    } catch (e) {
      // 用户取消或不支持，降级复制链接
      handleCopy();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = currentUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(title);

  // ====== 微信浏览器内：引导用户使用右上角菜单分享 ======
  if (isWechat) {
    return (
      <div className="flex flex-col gap-2 py-5 border-t border-b my-6" style={{ borderColor: 'var(--c-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--c-text-2)' }}>分享：</span>
          <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full text-white" style={{ backgroundColor: '#07c160' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01.182-.556C23.024 18.21 24 16.705 24 14.995c0-3.232-2.922-5.892-7.062-6.137zm-2.64 3.449c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm5.4 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z"/>
            </svg>
            点击右上角 ··· 分享给朋友
          </div>
        </div>
        {wxSdkFailed && (
          <p className="text-xs ml-10" style={{ color: 'var(--c-text-3)' }}>
            分享卡片将通过页面信息自动显示标题和封面图
          </p>
        )}
        {!wxSdkFailed && (
          <p className="text-xs ml-10" style={{ color: 'var(--c-text-3)' }}>
            分享卡片将自动显示文章标题、摘要和封面图
          </p>
        )}
      </div>
    );
  }

  // ====== 手机浏览器（非微信）：优先使用系统原生分享 ======
  if (canNativeShare) {
    return (
      <div className="flex flex-wrap items-center gap-3 py-5 border-t border-b my-6" style={{ borderColor: 'var(--c-border)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--c-text-2)' }}>分享：</span>

        {/* 系统原生分享按钮 — 弹出系统面板（含微信、微博等） */}
        <button
          onClick={handleNativeShare}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: 'var(--c-accent, #c41e3a)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/>
          </svg>
          分享文章
        </button>

        {/* 复制链接（备用） */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
          style={{
            borderColor: copied ? '#22c55e' : 'var(--c-border)',
            color: copied ? '#22c55e' : 'var(--c-text-2)',
            backgroundColor: copied ? '#f0fdf4' : 'transparent',
          }}
        >
          {copied ? '✓ 已复制' : '🔗 复制链接'}
        </button>
      </div>
    );
  }

  // ====== 桌面端：显示各平台按钮 ======
  return (
    <div className="flex flex-wrap items-center gap-3 py-5 border-t border-b my-6" style={{ borderColor: 'var(--c-border)' }}>
      <span className="text-sm font-medium" style={{ color: 'var(--c-text-2)' }}>分享：</span>

      {/* 微信：桌面端只能提示扫码或复制链接 */}
      <WechatDesktopShare url={currentUrl} onCopy={handleCopy} />

      {/* 微博 */}
      <a
        href={`https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
        style={{ backgroundColor: '#e6162d' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.098 20C5.65 20 2 17.748 2 14.965c0-1.496 1.032-3.235 2.813-4.866C6.785 8.223 9.007 7.5 10.9 7.5c.448 0 .887.04 1.313.116.226-.54.484-1.057.764-1.54C13.867 4.26 15.42 3 17.4 3c2.762 0 4.6 2.068 4.6 5.102 0 .26-.02.52-.06.775C23.13 9.44 24 10.38 24 11.5c0 2.21-2.73 4-6.1 4-.445 0-.88-.035-1.3-.1-.51.774-1.17 1.44-1.95 1.95C13.388 19.38 11.7 20 10.098 20zm.652-10.5c-2.51 0-5.25 1.546-5.25 3.75 0 1.924 1.87 3.25 4.25 3.25 2.51 0 5.25-1.546 5.25-3.75 0-1.924-1.87-3.25-4.25-3.25z"/>
        </svg>
        微博
      </a>

      {/* X / Twitter */}
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
        style={{ backgroundColor: '#000' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        X
      </a>

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
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            已复制
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            复制链接
          </>
        )}
      </button>
    </div>
  );
}

// 桌面端微信分享组件（弹出气泡提示）
function WechatDesktopShare({ url, onCopy }: { url: string; onCopy: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-opacity hover:opacity-80"
        style={{ backgroundColor: '#07c160' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01.182-.556C23.024 18.21 24 16.705 24 14.995c0-3.232-2.922-5.892-7.062-6.137zm-2.64 3.449c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm5.4 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z"/>
        </svg>
        微信
      </button>

      {open && (
        <>
          {/* 背景遮罩（点击关闭） */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-2 w-64 p-4 rounded-xl shadow-xl z-50"
            style={{ backgroundColor: 'white', border: '1px solid var(--c-border)' }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--c-text)' }}>分享到微信</p>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--c-text-3)' }}>
              复制下面的链接，在微信中粘贴给好友或分享到朋友圈。分享后将自动显示文章标题、摘要和封面图片。
            </p>
            <div className="flex items-center gap-1.5 p-2 rounded-lg text-xs font-mono mb-3 truncate" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-text-2)' }}>
              {url.slice(0, 50)}{url.length > 50 ? '…' : ''}
            </div>
            <button
              onClick={() => { onCopy(); setOpen(false); }}
              className="w-full py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#07c160' }}
            >
              复制链接
            </button>
          </div>
        </>
      )}
    </div>
  );
}
