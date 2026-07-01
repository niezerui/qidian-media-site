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
 * 解码 HTML 实体中的 &amp; &lt; &gt; &quot; &#x27; &#x2F; 等
 * 因为 innerHTML 会把 URL 中的 & 序列化为 &amp;，需要还原
 */
function decodeHtmlEntities(url: string): string {
  return url
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

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
  // 解码 HTML 实体（innerHTML 会把 & 序列化为 &amp;）
  const decoded = decodeHtmlEntities(url);
  // 相对路径不处理
  if (decoded.startsWith('/') || decoded.startsWith('data:')) return decoded;
  if (needsProxy(decoded)) {
    return `/api/img-proxy?url=${encodeURIComponent(decoded)}`;
  }
  return decoded;
}

/**
 * 将单个外链 URL 转为代理 URL（用于封面图等场景）
 */
export function proxyImageUrl(url: string): string {
  return getImageUrl(url);
}

/**
 * 扫描 HTML 正文中的所有 <img> 标签，将外链 src 改写为代理 URL
 * 同时处理微信懒加载图片（src 为空，data-src 有值）
 */
export function rewriteContentImages(html: string): string {
  if (!html) return '';

  return html.replace(/<img\b([^>]*)>/gi, (fullTag, attrs) => {
    // 提取 src 属性（精确匹配：排除 data-src，用负向后瞻确保 src 前不是 data-）
    // 注意：\b 会匹配 data-src 中的 src（因为 - 是非单词字符），必须用前瞻
    const srcMatch = attrs.match(/(?<![a-z-])src\s*=\s*"([^"]*)"/i)
      || attrs.match(/(?<![a-z-])src\s*=\s*'([^']*)'/i);
    const srcValue = srcMatch ? (srcMatch[1] ?? '') : null;

    // 提取 data-src 属性（微信懒加载图片）
    const dataSrcMatch = attrs.match(/data-src\s*=\s*"([^"]*)"/i)
      || attrs.match(/data-src\s*=\s*'([^']*)'/i);
    const dataSrcValue = dataSrcMatch ? (dataSrcMatch[1] ?? '') : null;

    // 确定真实图片 URL：优先用 data-src（当 src 为空或不存在时）
    const useDataSrc = dataSrcValue && (!srcValue || srcValue.trim() === '');
    const realSrc = useDataSrc ? dataSrcValue : (srcValue ?? '');

    // 跳过：data:URI（base64 内嵌）、相对路径、空 URL
    if (!realSrc || realSrc.startsWith('data:') || realSrc.startsWith('/')) {
      return fullTag;
    }

    const proxyUrl = getImageUrl(realSrc);
    if (proxyUrl === realSrc) return fullTag; // 无需代理，保持原样

    // 更新 src 属性为代理 URL
    let newAttrs: string;
    if (srcMatch) {
      // 有 src 属性（即使为空）→ 替换 src 值为代理 URL（精确替换，避免影响 data-src）
      newAttrs = attrs.replace(srcMatch[0], `src="${proxyUrl}"`);
    } else {
      // 没有 src 属性（只有 data-src）→ 追加 src 属性
      // 处理自闭合标签：如果 attrs 末尾有 /，需要在 / 之前插入 src
      const selfCloseMatch = attrs.match(/^(.*)\s*\/\s*$/);
      if (selfCloseMatch) {
        // 自闭合标签：在 / 之前插入 src
        newAttrs = `${selfCloseMatch[1]} src="${proxyUrl}" /`;
      } else {
        newAttrs = attrs + ` src="${proxyUrl}"`;
      }
    }
    return `<img${newAttrs}>`;
  });
}
