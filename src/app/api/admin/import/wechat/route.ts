import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { execute, query, queryOne } from '@/lib/db';
import { sanitizeRichContent, generateSlug, sanitizeInput } from '@/lib/security';

// 需要走代理的图片域名
const PROXY_DOMAINS = ['mmbiz.qpic.cn', 'mmbiz.qlogo.cn'];

/**
 * 将图片 URL 改写为代理 URL
 */
function proxyImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('/') || url.startsWith('data:')) return url;
  try {
    const u = new URL(url.startsWith('//') ? 'https:' + url : url);
    if (PROXY_DOMAINS.some(d => u.hostname === d || u.hostname.endsWith('.' + d))) {
      return `/api/img-proxy?url=${encodeURIComponent(u.toString())}`;
    }
  } catch {}
  return url;
}

/**
 * 改写 HTML 中所有图片 src 为代理 URL
 */
function rewriteContentImages(html: string): string {
  // 1. 先处理 data-src → src（微信懒加载）
  let result = html.replace(/\bdata-src\s*=\s*"/gi, 'src="');
  // 2. 处理协议相对 URL
  result = result.replace(/src\s*=\s*"\/\//gi, 'src="https://');
  // 3. 改写所有 img src 为代理
  result = result.replace(/<img\s+([^>]*?)src\s*=\s*"([^"]+)"([^>]*?)>/gi, (_m: string, before: string, src: string, after: string) => {
    const newSrc = proxyImageUrl(src);
    return `<img ${before}src="${newSrc}"${after}>`;
  });
  return result;
}

/**
 * 提取 HTML 中位于起始 div 和其匹配闭合 </div> 之间的内容
 * 使用括号计数正确处理嵌套 div，大小写不敏感
 */
function extractDivContent(html: string, startPattern: RegExp): string {
  const startMatch = html.match(startPattern);
  if (!startMatch || startMatch.index === undefined) return '';

  const startIdx = startMatch.index + startMatch[0].length;
  let depth = 1;
  let pos = startIdx;

  // 同时搜索大小写
  while (pos < html.length && depth > 0) {
    const nextOpenLower = html.indexOf('<div', pos);
    const nextOpenUpper = html.indexOf('<DIV', pos);
    const nextOpen = nextOpenLower === -1 ? nextOpenUpper
      : nextOpenUpper === -1 ? nextOpenLower
      : Math.min(nextOpenLower, nextOpenUpper);

    const nextCloseLower = html.indexOf('</div>', pos);
    const nextCloseUpper = html.indexOf('</DIV>', pos);
    const nextClose = nextCloseLower === -1 ? nextCloseUpper
      : nextCloseUpper === -1 ? nextCloseLower
      : Math.min(nextCloseLower, nextCloseUpper);

    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      // 检查是否是真的 <div> 标签
      const afterTag = html.substring(nextOpen + 4, nextOpen + 24).trim();
      if (/^[>\s\/]/.test(afterTag)) {
        depth++;
      }
      pos = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) {
        return html.substring(startIdx, nextClose);
      }
      pos = nextClose + 6;
    }
  }

  return '';
}

/**
 * 从 HTML 中通过正则提取第一个匹配的内容
 */
function extractByRegex(html: string, pattern: RegExp, group: number = 1): string {
  const m = html.match(pattern);
  return m?.[group]?.trim() || '';
}

/**
 * 检测是否为微信验证/安全页面
 * 返回原因字符串，如果不是验证页则返回 null
 */
function detectVerificationPage(html: string): string | null {
  // 先检查纯函数条件
  if (html.includes('weui-msg') && !html.includes('rich_media_content') && !html.includes('js_content')) {
    return '无文章内容 (只有 weui-msg)';
  }

  // 正则检测
  const regexChecks: [string, RegExp][] = [
    ['需要输入验证码', /请输入验证码/i],
    ['环境异常', /环境异常/i],
    ['请在微信客户端打开', /请在微信客户端打开/i],
    ['安全拦截页面 (PAGE_MID=verify)', /PAGE_MID\s*[=:]\s*['"]mmbizwap:secitptpage\/verify/i],
    ['安全拦截页面 (secitptpage)', /secitptpage/i],
    ['文章已删除', /该内容已被发布者删除/i],
    ['文章已删除 (系统提示)', /此内容因违规无法查看/i],
  ];

  for (const [reason, pattern] of regexChecks) {
    if (pattern.test(html)) return reason;
  }
  return null;
}

/**
 * 检查提取的内容是否有有意义的文字
 */
function hasMeaningfulText(html: string): boolean {
  const text = html
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')  // 去掉所有 HTML 标签
    .replace(/&[a-z]+;/gi, '')  // 去掉 HTML 实体
    .replace(/[\s\n\r\t]+/g, ' ')  // 合并空白
    .trim();
  return text.length >= 10;
}

/**
 * 抓取公众号文章页面 HTML
 * 尝试多种策略绕过验证
 */
async function fetchWechatArticle(url: string) {
  // 清理 URL
  const cleanUrl = url.replace(/[?&]chksm=[^&]+/g, '');

  // 策略1：标准浏览器请求头
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Referer': 'https://mp.weixin.qq.com/',
  };

  let response = await fetch(cleanUrl, { headers, redirect: 'follow' });

  // 如果被拦截，尝试策略2：使用微信内置浏览器 UA
  const html = await response.text();
  if (detectVerificationPage(html)) {
    console.log('[WeChat Import] 策略1被拦截，尝试策略2 (微信浏览器UA)...');
    const wxHeaders = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Mobile MicroMessenger/8.0.40.2420(0x28002838) NetType/WIFI Language/zh_CN',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Referer': 'https://mp.weixin.qq.com/',
    };
    try {
      const wxResp = await fetch(cleanUrl, { headers: wxHeaders, redirect: 'follow' });
      const wxHtml = await wxResp.text();
      if (!detectVerificationPage(wxHtml)) return wxHtml;
      console.log('[WeChat Import] 策略2也失败');
    } catch {}
    return html; // 返回原始HTML给后续检测
  }

  return html;
}

/**
 * 从 HTML 中提取公众号文章信息
 */
function parseWechatHtml(html: string) {
  // === 提取标题 ===
  let title = '';
  title = extractByRegex(html, /<meta\s+property="og:title"\s+content="([^"]*)"/i);
  if (!title) {
    title = extractByRegex(html, /<h1[^>]*class="[^"]*rich_media_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
      .replace(/<[^>]+>/g, '').trim();
  }
  if (!title) {
    title = extractByRegex(html, /<title>([\s\S]*?)<\/title>/i);
  }

  // === 提取封面图 ===
  let coverImage = extractByRegex(html, /<meta\s+property="og:image"\s+content="([^"]*)"/i);

  // === 提取摘要 ===
  let summary = extractByRegex(html, /<meta\s+property="og:description"\s+content="([^"]*)"/i);
  if (!summary) {
    summary = extractByRegex(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  }

  // === 提取公众号名称 ===
  let sourceName = '';
  sourceName = extractByRegex(html, /var\s+nickname\s*=\s*["']([^"']*)["']/i);
  if (!sourceName) {
    sourceName = extractByRegex(html, /<strong[^>]*class="[^"]*profile_nickname[^"]*"[^>]*>([\s\S]*?)<\/strong>/i);
  }
  if (!sourceName) {
    sourceName = extractByRegex(html, /"nickname"\s*:\s*"([^"]*)"/i);
  }

  // === 多种策略提取正文内容 ===
  const strategies: Array<{ name: string; pattern: RegExp }> = [
    { name: 'js_content', pattern: /<div[^>]*id\s*=\s*["']js_content["'][^>]*>/i },
    { name: 'rich_media_content', pattern: /<div[^>]*class\s*=\s*["'][^"']*rich_media_content[^"']*["'][^>]*>/i },
    { name: 'rich_media_area_primary', pattern: /<div[^>]*id\s*=\s*["']img-content["'][^>]*>/i },
    // 回退：尝试 body 内的主内容区
    { name: 'body_content', pattern: /<body\b[^>]*>/i },
  ];

  let content = '';
  let usedStrategy = '';

  for (const { name, pattern } of strategies) {
    content = extractDivContent(html, pattern);
    if (content && name !== 'body_content') {
      // 去掉 style/script
      content = content.replace(/<style\b[\s\S]*?<\/style>/gi, '');
      content = content.replace(/<script\b[\s\S]*?<\/script>/gi, '');
      // 检查是否有实际内容
      if (hasMeaningfulText(content)) {
        usedStrategy = name;
        break;
      }
      content = ''; // 内容太短，重置
    } else if (content && name === 'body_content') {
      usedStrategy = name;
      break;
    }
  }

  if (!content) {
    throw new Error('无法提取文章正文内容。请确保：\n1. 链接是有效的公众号文章\n2. 在微信中打开文章 → 右上角"..." → "在浏览器中打开" → 复制浏览器地址栏的链接');
  }

  // === 清理内容 ===
  // 移除不可见元素
  // 方式1: 精确匹配 display:none 或 visibility:hidden 的元素
  content = content.replace(/<([a-z][a-z0-9-]*)\s[^>]*\bstyle\s*=\s*"[^"]*(?:display\s*:\s*none|visibility\s*:\s*hidden)[^"]*"[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  // 去掉空的块级标签
  content = content.replace(/<(p|div|span|section|article|h[1-6])\b[^>]*>\s*<\/\1>/gi, '');

  // 解码 HTML 实体
  content = content
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // === 改写图片 URL 为代理 ===
  content = rewriteContentImages(content);

  // 如果没有提取到封面图，尝试从正文第一张图片获取
  if (!coverImage) {
    const firstImg = content.match(/<img[^>]+src\s*=\s*"([^"]+)"/i);
    if (firstImg) coverImage = firstImg[1];
  }

  // 封面图也走代理
  coverImage = proxyImageUrl(coverImage);

  // === 最终验证：内容是否有实际文字 ===
  if (!hasMeaningfulText(content)) {
    throw new Error('提取的内容中没有足够的文字信息，可能该文章以图片为主或内容被屏蔽');
  }

  // === 安全过滤 ===
  content = sanitizeRichContent(content);

  // 安全过滤后再检查一次
  if (!hasMeaningfulText(content)) {
    throw new Error('安全过滤后内容为空，文章格式可能不兼容');
  }

  return {
    title,
    summary,
    coverImage,
    sourceName,
    content,
    usedStrategy,
  };
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const url = (body.url || '').trim();
    const autoCreate = body.autoCreate !== false;
    const categoryId = body.category_id ? parseInt(body.category_id) : null;

    if (!url) {
      return NextResponse.json(
        { success: false, error: '请输入公众号文章链接' },
        { status: 400 }
      );
    }

    if (!url.includes('mp.weixin.qq.com') && !url.includes('weixin.qq.com')) {
      return NextResponse.json(
        { success: false, error: '请粘贴有效的微信公众号文章链接（mp.weixin.qq.com）' },
        { status: 400 }
      );
    }

    // ===== 抓取并检测 =====
    const html = await fetchWechatArticle(url);

    // 检测验证页/异常页
    const verifyReason = detectVerificationPage(html);
    if (verifyReason) {
      return NextResponse.json({
        success: false,
        error: `微信返回了${verifyReason}。\n\n解决方案：在微信中打开文章 → 点击右上角"..." → 选择"在浏览器中打开" → 复制浏览器地址栏的链接后再试。`,
        debug: { htmlLength: html.length, pageType: verifyReason },
      }, { status: 400 });
    }

    // ===== 解析文章内容 =====
    const article = parseWechatHtml(html);

    // ===== 诊断信息（在非 autoCreate 模式下返回给前端查看） =====
    const debugInfo = {
      htmlLength: html.length,
      hasJsContent: /id\s*=\s*["']js_content["']/i.test(html),
      hasRichMedia: /rich_media_content/i.test(html),
      extractedLength: article.content.length,
      textLength: article.content.replace(/<[^>]+>/g, '').trim().length,
      strategy: article.usedStrategy,
      title: article.title,
      coverImage: article.coverImage,
    };

    if (autoCreate && categoryId) {
      let slug = generateSlug(article.title);
      // 确保 slug 不重复
      const existing = await queryOne('SELECT id FROM articles WHERE slug = ?', [slug]);
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }

      const sourceNote = article.sourceName
        ? `\n\n<p style="color:#999;font-size:14px;">来源：公众号「${article.sourceName}」</p>`
        : '';

      const finalContent = article.content + sourceNote;

      const result = await execute(
        `INSERT INTO articles (title, slug, summary, content, cover_image, category_id, author, tags, is_featured, is_exclusive, is_banner, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'draft')`,
        [
          sanitizeInput(article.title),
          slug,
          article.summary,
          finalContent,
          article.coverImage,
          categoryId,
          '奇点编辑部',
          '[]',
        ]
      );

      const newArticle = await query('SELECT * FROM articles WHERE id = ?', [result.lastInsertRowid]);

      return NextResponse.json({
        success: true,
        data: {
          article: newArticle[0] || null,
          extracted: {
            title: article.title,
            summary: article.summary,
            coverImage: article.coverImage,
            sourceName: article.sourceName,
          },
          debug: debugInfo,
          message: `已导入为草稿：${article.title}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        extracted: {
          title: article.title,
          summary: article.summary,
          coverImage: article.coverImage,
          sourceName: article.sourceName,
          content: article.content,
        },
        debug: debugInfo,
        message: '文章内容提取成功',
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    console.error('WeChat import error:', error);
    return NextResponse.json(
      { success: false, error: error.message || '导入失败' },
      { status: 500 }
    );
  }
}
