import sanitizeHtml from 'sanitize-html';

// XSS Protection: sanitize all user input
export function sanitizeInput(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

// Sanitize rich HTML content (for article body)
// 注意：data: URI 图片（base64）必须完整保留，不能截断
export function sanitizeRichContent(html: string): string {
  if (!html) return '';

  // 第一步：用更健壮的方式提取所有 img 标签中的 data:URI src
  // 原理：先整体解析 img 标签，提取 src 属性值（无论用单引号/双引号/无引号）
  const dataUriMap: Record<string, string> = {};
  let counter = 0;

  // 匹配完整 img 标签（包括自闭合和非自闭合），然后从中提取 src
  const htmlWithPlaceholders = html.replace(/<img\b([^>]*)>/gi, (fullTag, attrs) => {
    // 精确提取 src 属性值（排除 data-src：用负向后瞻 (?<![a-z-]) 防止匹配 data-src 中的 src）
    const srcMatch = attrs.match(/(?<![a-z-])src\s*=\s*"([^"]*)"/i)
      || attrs.match(/(?<![a-z-])src\s*=\s*'([^']*)'/i);
    if (!srcMatch) return fullTag;
    const srcValue = srcMatch[1];
    if (!srcValue || !srcValue.startsWith('data:')) return fullTag;

    const key = `DATAURIPLHDR${counter++}END`;
    dataUriMap[key] = srcValue;
    // 精确替换 src 属性值（替换 srcMatch[0] 所代表的完整属性字符串）
    const newAttrs = attrs.replace(srcMatch[0], `src="${key}"`);
    return `<img${newAttrs}>`;
  });

  // 第二步：正常 sanitize（此时 img src 中没有 data: 了）
  const sanitized = sanitizeHtml(htmlWithPlaceholders, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'video', 'source', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'figure', 'figcaption', 'iframe', 'pre', 'code', 'blockquote', 'table',
      'thead', 'tbody', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['style', 'class', 'id'],
      img: ['src', 'alt', 'width', 'height', 'loading', 'style', 'data-src', 'data-type', 'data-ratio', 'data-w'],
      video: ['src', 'controls', 'width', 'height', 'poster'],
      source: ['src', 'type'],
      iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
      a: ['href', 'target', 'rel'],
      td: ['colspan', 'rowspan', 'style'],
      th: ['colspan', 'rowspan', 'style'],
    },
    allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel'],
    allowedIframeHostnames: ['www.youtube.com', 'player.bilibili.com', 'v.qq.com'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  });

  // 第三步：把占位符还原为原始 data: URI（用全局替换，防止多次出现同一 key 的情况）
  let result = sanitized;
  for (const [key, dataUri] of Object.entries(dataUriMap)) {
    // 占位符在 sanitize 后可能出现在 src="DATAURIPLHDR0END" 中
    result = result.split(key).join(dataUri);
  }

  return result;
}

// Rate limiting (in-memory, simple implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

// Clean up old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((value, key) => {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  });
}, 60000);

// Slug generation — 支持中文标题（转拼音hash）
export function generateSlug(title: string): string {
  // 先尝试英文/数字转换
  let slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')   // 去除非英文字符
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 80);

  // 如果 slug 为空（纯中文标题），使用时间戳+随机数生成唯一 slug
  if (!slug || slug === '-') {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    slug = `article-${ts}-${rand}`;
  }

  return slug;
}

// Input validation helpers
export function validateArticleInput(data: any): string[] {
  const errors: string[] = [];
  const isDraft = data.status === 'draft';

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('标题不能为空');
  }
  if (data.title && data.title.length > 200) {
    errors.push('标题不能超过200字符');
  }
  if (!data.category_id || isNaN(Number(data.category_id)) || Number(data.category_id) <= 0) {
    errors.push('请选择文章分类');
  }
  // 发布时必须有内容，草稿可以没有
  // 注意：内容可能只有图片（没有纯文字），因此放宽校验：只要有内容HTML就算有效
  if (!isDraft && (!data.content || data.content.trim().length < 5)) {
    errors.push('正文内容不能为空');
  }
  // HTML 源码长度上限（含标签、图片base64等），设为 8MB 以容纳富媒体内容
  if (data.content && data.content.length > 8_000_000) {
    errors.push('内容过大（超过8MB），请压缩图片后重试');
  }
  return errors;
}

export function validateFlashInput(data: any): string[] {
  const errors: string[] = [];
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('标题不能为空');
  }
  if (data.title && data.title.length > 200) {
    errors.push('标题不能超过200字符');
  }
  return errors;
}

// ===== Content Cleaner: 修复乱码"???"问题 =====
// 富文本编辑器内容可能含JSON转义字符，渲染前需还原
export function cleanContent(html: string): string {
  if (!html) return '';
  return html
    .replace(/\\"/g, '"')       // JSON转义双引号
    .replace(/\\n/g, '\n')      // \n 字面量 → 真实换行
    .replace(/\\t/g, '\t')      // \t 字面量
    .replace(/\\\\/g, '\\')     // 双反斜杠还原
    .replace(/\\'/g, "'");      // 转义单引号
}

// 从文章内容中提取第一张图片URL作为封面
export function extractFirstImage(html: string): string | null {
  if (!html) return null;
  const cleaned = cleanContent(html);
  const match = cleaned.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}
