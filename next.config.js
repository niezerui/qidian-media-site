/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
    unoptimized: true,
  },

  // 301 重定向：裸域 → www，统一域名集中搜索权重
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'qidianyanjiushe.com' }],
        destination: 'https://www.qidianyanjiushe.com/:path*',
        permanent: true,
      },
    ];
  },

  // llms.txt 规范：为页面提供 .md 纯文本版本（https://llmstxt.org/）
  // 必须放在 beforeFiles，否则 /article/30.md 会先命中 [id] 页面路由而 404
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/index.md', destination: '/md/home' },
        { source: '/articles.md', destination: '/md/articles' },
        { source: '/article/:id.md', destination: '/md/article/:id' },
        { source: '/category/:slug.md', destination: '/md/category/:slug' },
        { source: '/about.md', destination: '/md/static/about' },
        { source: '/contact.md', destination: '/md/static/contact' },
        { source: '/join.md', destination: '/md/static/join' },
        { source: '/advertise.md', destination: '/md/static/advertise' },
        { source: '/privacy.md', destination: '/md/static/privacy' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  // Security headers
  async headers() {
    return [
      {
        // 全站只放安全头，不再统一加 Cache-Control：
        // 之前给所有路由加 no-store 会让 ISR/CDN 缓存完全失效，每次访问都回源到
        // Serverless Function，直接烧「边缘请求 + 函数调用 + 带宽」三项 Hobby 配额，
        // 2026-10-23 账号因此被 Vercel 暂停（402 DEPLOYMENT_DISABLED）。
        // 公开页面交给各页面自身的 `export const revalidate = 60` 控制缓存。
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            // connect-src 必须同时放行两处，否则浏览器直传会被 CSP 拦下并无限重试（表现为「一直加载中」）：
            //   1) https://vercel.com/api/blob/  —— @vercel/blob/client 的实际上传端点
            //   2) https://*.blob.vercel-storage.com —— 对象存储读回（图片/视频公开地址）
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src * data: blob:; media-src * blob:; connect-src 'self' https://vercel.com https://*.vercel.com https://*.blob.vercel-storage.com; frame-src www.youtube.com player.bilibili.com v.qq.com;",
          },
        ],
      },
      {
        // 后台与接口必须实时：严禁缓存，避免看到旧数据
        source: '/admin/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
