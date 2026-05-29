import sanitizeHtml from 'sanitize-html';

// XSS Protection: sanitize all user input
export function sanitizeInput(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

// Sanitize rich HTML content (for article body)
export function sanitizeRichContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'video', 'source', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'figure', 'figcaption', 'iframe', 'pre', 'code', 'blockquote',
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height', 'loading'],
      video: ['src', 'controls', 'width', 'height', 'poster'],
      source: ['src', 'type'],
      iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
      a: ['href', 'target', 'rel'],
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

// Slug generation
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 100);
}

// Input validation helpers
export function validateArticleInput(data: any): string[] {
  const errors: string[] = [];
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('标题不能为空');
  }
  if (data.title && data.title.length > 200) {
    errors.push('标题不能超过200字符');
  }
  if (!data.category_id || isNaN(Number(data.category_id))) {
    errors.push('请选择分类');
  }
  if (data.content && data.content.length > 100000) {
    errors.push('内容不能超过100000字符');
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
