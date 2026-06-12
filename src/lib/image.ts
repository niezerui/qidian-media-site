/**
 * 图片 URL 工具
 * 对外链图片使用服务端代理，避免防盗链问题
 */

// 本站域名（上传的图片不需要代理）
const OWN_DOMAINS = [
  'qidianyanjiushe.com',
  'localhost',
  '127.0.0.1',
];

// 明确需要代理的外链图片域名（防盗链严格）
const NEED_PROXY_DOMAINS = [
  'p3-sign.douyinpic.com',
  'p9-sign.douyinpic.com',
  'p6-sign.douyinpic.com',
  'p26-sign.douyinpic.com',
  'img.dingxinwen.cn',
  'img3.dingxinwen.cn',
  'p3-pc-sign.douyinpic.com',
  'p6-pc-sign.douyinpic.com',
  'inews.gtimg.com',
  'n.sinaimg.cn',
  'mmbiz.qpic.cn',
  'pic.rmb.bdstatic.com',
  'p1.itc.cn',
  'nimg.ws.126.net',
];

/**
 * 判断是否需要代理
 */
function needsProxy(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const hostname = u.hostname;
    // 本站图片不代理
    if (OWN_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) return false;
    // 明确需要代理的域名
    if (NEED_PROXY_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) return true;
    // 其他外链也代理（保守策略）
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取图片展示 URL：外链自动走代理接口
 */
export function getImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  // 相对路径不处理
  if (url.startsWith('/') || url.startsWith('data:')) return url;
  if (needsProxy(url)) {
    return `/api/img-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * 将单个外链 URL 转为代理 URL（用于封面图等场景）
 */
export function proxyImageUrl(url: string): string {
  return getImageUrl(url);
}

/**
 * 扫描 HTML 正文中的所有 <img> 标签，将外链 src 改写为代理 URL
 */
export function rewriteContentImages(html: string): string {
  if (!html) return '';

  // 匹配 <img ... src="xxx" ...>
  return html.replace(/<img\b([^>]*?)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
    // 处理 data-src（微信懒加载图片）
    const dataSrcMatch = before.match(/data-src\s*=\s*["']([^"']+)["']/i);
    const realSrc = dataSrcMatch ? dataSrcMatch[1] : src;

    if (realSrc.startsWith('data:') || realSrc.startsWith('/') || realSrc === '') {
      return match; // 保持原样
    }

    const proxyUrl = getImageUrl(realSrc);
    // 用原始 src 位置替换
    return `<img${before}src="${proxyUrl}"${after}>`;
  });
}
