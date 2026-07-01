import sanitizeHtml from 'sanitize-html';

// XSS Protection: sanitize all user input
export function sanitizeInput(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

// Sanitize rich HTML content (for article body)
// 直接允许 data: scheme，避免占位符机制带来的不确定性
export function sanitizeRichContent(html: string): string {
  if (!html) return '';

  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'video', 'source', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'figure', 'figcaption', 'iframe', 'pre', 'code', 'blockquote', 'table',
      'thead', 'tbody', 'tr', 'td', 'th', 'caption', 'colgroup', 'col',
      'section', 'span', 'br', 'hr', 'em', 'strong', 'u', 's', 'sub', 'sup',
      'mark', 'abbr', 'del', 'ins',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['style', 'class', 'id'],
      img: ['src', 'alt', 'width', 'height', 'loading', 'style', 'class', 'id', 'data-src', 'data-type', 'data-ratio', 'data-w', 'title'],
      video: ['src', 'controls', 'width', 'height', 'poster', 'style', 'class'],
      source: ['src', 'type'],
      iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'style'],
      a: ['href', 'target', 'rel', 'style', 'class'],
      td: ['colspan', 'rowspan', 'style', 'class'],
      th: ['colspan', 'rowspan', 'style', 'class'],
      table: ['style', 'class', 'border', 'cellpadding', 'cellspacing'],
      figure: ['style', 'class'],
      figcaption: ['style', 'class'],
      p: ['style', 'class'],
      span: ['style', 'class'],
    },
    allowedSchemes: ['http', 'https', 'ftp', 'mailto', 'tel', 'data'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
      video: ['http', 'https'],
      source: ['http', 'https'],
    },
    allowedIframeHostnames: ['www.youtube.com', 'player.bilibili.com', 'v.qq.com'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
    },
  });
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
// 只有当内容明确包含 JSON 转义序列时才处理，避免破坏正常 HTML
export function cleanContent(html: string): string {
  if (!html) return '';
  // 先检测是否真的需要清理（内容中是否含有 JSON 转义序列）
  if (!/\\["'nt\\]/.test(html)) return html;

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
