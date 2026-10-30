/**
 * 轻量 HTML → Markdown 转换器（供 /llms.txt 与各页面 .md 版本使用）
 *
 * 设计要点：
 * - 不引入第三方依赖，纯正则实现，内容为站内受控 HTML（保存时已 sanitize）
 * - ⚠️ 必须剔除 data: URI 图片：正文图片以 base64 内嵌，单图可达数百 KB，
 *   直接输出会让 markdown 体积爆炸、失去给 LLM 阅读的意义
 * - 外链图片保留为 markdown 图片，并转换为绝对地址
 */

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&middot;': '·',
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

function absoluteUrl(url: string, baseUrl: string): string {
  const u = url.trim();
  if (!u) return '';
  if (/^(https?:)?\/\//i.test(u)) return u.startsWith('//') ? `https:${u}` : u;
  if (u.startsWith('/')) return `${baseUrl}${u}`;
  if (u.startsWith('#')) return u;
  return `${baseUrl}/${u}`;
}

/** 行内元素转换：加粗/斜体/删除线/行内代码/链接/图片 */
function convertInline(html: string, baseUrl: string): string {
  let out = html;

  // 图片（先处理，避免内部属性被后续规则破坏）
  out = out.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = /src\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
    const alt = /alt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag);
    const rawSrc = (src?.[1] ?? src?.[2] ?? '').trim();
    const altText = (alt?.[1] ?? alt?.[2] ?? '图片').trim();
    // base64 内嵌图直接丢弃（体积过大，对 LLM 无意义）
    if (!rawSrc || /^data:/i.test(rawSrc)) return '';
    return `![${altText}](${absoluteUrl(rawSrc, baseUrl)})`;
  });

  // 链接
  out = out.replace(/<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, d, s, text) => {
      const href = (d ?? s ?? '').trim();
      const label = String(text).replace(/<[^>]+>/g, '').trim();
      if (!href) return label;
      if (/^data:/i.test(href)) return label;
      return `[${label || href}](${absoluteUrl(href, baseUrl)})`;
    });

  // 强调
  out = out
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, t) => `**${String(t).trim()}**`)
    .replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, t) => `*${String(t).trim()}*`)
    .replace(/<(del|s|strike)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, t) => `~~${String(t).trim()}~~`)
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_m, t) => `\`${String(t).trim()}\``);

  return out;
}

/**
 * HTML → Markdown
 * @param html 文章正文 HTML
 * @param baseUrl 站点根地址（用于把相对链接/图片补成绝对地址）
 */
export function htmlToMarkdown(html: string, baseUrl = 'https://www.qidianyanjiushe.com'): string {
  if (!html) return '';
  let out = html;

  // 剔除不可见/危险内容
  out = out
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<iframe\b[^>]*src\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>[\s\S]*?<\/iframe>/gi,
      (_m, d, s) => `\n\n[嵌入内容](${absoluteUrl(String(d ?? s ?? ''), baseUrl)})\n\n`)
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '\n\n[嵌入内容]\n\n')
    .replace(/<(video|audio)\b[^>]*src\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>[\s\S]*?<\/\1>/gi,
      (_m, _t, d, s) => `\n\n[视频](${absoluteUrl(String(d ?? s ?? ''), baseUrl)})\n\n`)
    .replace(/<(video|audio)\b[^>]*>[\s\S]*?<\/\1>/gi, '\n\n[视频/音频内容]\n\n');

  // 代码块（整块转 fenced code，避免被行内规则拆散）
  out = out.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_m, code) => {
    const text = decodeEntities(
      String(code)
        .replace(/<code\b[^>]*>/gi, '')
        .replace(/<\/code>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
    ).trim();
    return `\n\n\`\`\`\n${text}\n\`\`\`\n\n`;
  });

  // 换行与段落边界
  out = out
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|figure|figcaption|tr|table|ul|ol|blockquote)>/gi, '\n\n')
    .replace(/<(p|div|section|article|figure)\b[^>]*>/gi, '');

  // 标题
  out = out.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level, text) =>
    `\n\n${'#'.repeat(Number(level))} ${String(text).replace(/<[^>]+>/g, '').trim()}\n\n`);

  // 引用
  out = out.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, inner) => {
    const body = String(inner).replace(/<[^>]+>/g, '').trim().split('\n').filter(Boolean);
    return `\n\n${body.map(l => `> ${l.trim()}`).join('\n')}\n\n`;
  });

  // 有序列表（保留编号）
  out = out.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_m, inner) => {
    let i = 0;
    const items = String(inner).replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_x, li) => {
      i += 1;
      return `\n${i}. ${String(li).replace(/<[^>]+>/g, '').trim()}`;
    });
    return `\n\n${items.trim()}\n\n`;
  });

  // 无序列表
  out = out.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_m, inner) => {
    const items = String(inner).replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_x, li) =>
      `\n- ${String(li).replace(/<[^>]+>/g, '').trim()}`);
    return `\n\n${items.trim()}\n\n`;
  });

  // 表格（简化为管道表格）
  out = out.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_m, inner) => {
    const rows = Array.from(String(inner).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)).map(r =>
      Array.from(String(r[1]).matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi))
        .map(c => String(c[1]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    );
    if (rows.length === 0) return '';
    const head = rows[0];
    const body = rows.slice(1);
    const lines = [
      `| ${head.join(' | ')} |`,
      `| ${head.map(() => '---').join(' | ')} |`,
      ...body.map(r => `| ${r.join(' | ')} |`),
    ];
    return `\n\n${lines.join('\n')}\n\n`;
  });

  // 分割线
  out = out.replace(/<hr\b[^>]*\/?>/gi, '\n\n---\n\n');

  // 剩余块级标签剥离
  out = out.replace(/<(li|td|th|thead|tbody|span|font|mark|sub|sup|abbr|ins|small)\b[^>]*>/gi, '');
  out = out.replace(/<\/(li|td|th|thead|tbody|span|font|mark|sub|sup|abbr|ins|small)>/gi, '');

  // 行内格式化
  out = convertInline(out, baseUrl);

  // 清理残留标签、解码实体
  out = out.replace(/<[^>]+>/g, '');
  out = decodeEntities(out);

  // 规范化空白：行内多余空格、3+ 连续空行压缩为 1 个空行
  out = out
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return out;
}

/** 从 HTML 正文提取纯文本摘要（剔除 base64 图片，用于 markdown 前置摘要） */
export function excerptFromHtml(html: string, maxLen = 160): string {
  if (!html) return '';
  const text = decodeEntities(
    html
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<img\b[^>]*>/gi, '')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

/** 格式化日期为 YYYY-MM-DD */
export function formatDateCN(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
