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
  let result = html.replace(/data-src="/gi, 'src="');

  // 2. 处理协议相对 URL
  result = result.replace(/src="\/\//g, 'src="https://');

  // 3. 改写所有 img src 为代理
  result = result.replace(/<img\s+([^>]*?)src="([^"]+)"([^>]*?)>/gi, (match, before, src, after) => {
    const newSrc = proxyImageUrl(src);
    return `<img ${before}src="${newSrc}"${after}>`;
  });

  return result;
}

/**
 * 提取 HTML 中位于起始 div id="X" 和其匹配闭合 </div> 之间的内容
 * 使用括号计数正确处理嵌套 div
 */
function extractDivContent(html: string, startPattern: RegExp): string {
  const startMatch = html.match(startPattern);
  if (!startMatch || startMatch.index === undefined) return '';

  // 找到起始 div 的结束位置（> 的位置）
  const startIdx = startMatch.index + startMatch[0].length;
  let depth = 1;
  let pos = startIdx;

  // 逐字符扫描，追踪 <div 和 </div> 的嵌套层级
  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', pos);
    const nextClose = html.indexOf('</div>', pos);

    if (nextClose === -1) break;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      // 先遇到开标签
      const afterTag = html.substring(nextOpen + 4, nextOpen + 20).trim();
      // 排除非 div 标签（如 <divider> 等）
      if (afterTag.startsWith('>') || afterTag.startsWith(' ') || afterTag.startsWith('\t') || afterTag.startsWith('\n') || afterTag.startsWith('\r')) {
        depth++;
      }
      pos = nextOpen + 4;
    } else {
      // 先遇到闭标签
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
 * 抓取公众号文章页面 HTML
 */
async function fetchWechatArticle(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`请求失败: HTTP ${response.status}`);
  }

  return response.text();
}

/**
 * 解码 HTML 实体
 */
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * 从HTML中提取公众号文章信息
 */
function parseWechatHtml(html: string) {
  // === 提取标题 ===
  let title = '';
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
  if (ogTitle) title = decodeEntities(ogTitle[1]);
  if (!title) {
    const h1Match = html.match(/<h1[^>]*class="[^"]*rich_media_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) title = h1Match[1].replace(/<[^>]+>/g, '').trim();
  }
  if (!title) {
    const tMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    if (tMatch) title = decodeEntities(tMatch[1].trim());
  }

  // === 提取封面图 ===
  let coverImage = '';
  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
  if (ogImage) coverImage = ogImage[1];

  // === 提取摘要 ===
  let summary = '';
  const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
  if (ogDesc) summary = decodeEntities(ogDesc[1]);
  if (!summary) {
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    if (descMatch) summary = decodeEntities(descMatch[1]);
  }

  // === 提取公众号名称 ===
  let sourceName = '';
  const nicknameMatch = html.match(/var\s+nickname\s*=\s*"([^"]*)"/i);
  if (nicknameMatch) {
    sourceName = decodeEntities(nicknameMatch[1]);
  }
  if (!sourceName) {
    const profileMatch = html.match(/<strong[^>]*class="[^"]*profile_nickname[^"]*"[^>]*>([\s\S]*?)<\/strong>/i);
    if (profileMatch) sourceName = profileMatch[1].trim();
  }
  if (!sourceName) {
    const jsName = html.match(/var\s+msg_title[\s\S]*?nickname\s*=\s*"([^"]*)"/i);
    if (!jsName) {
      const jsName2 = html.match(/"nickname"\s*:\s*"([^"]*)"/i);
      if (jsName2) sourceName = jsName2[1];
    } else {
      sourceName = jsName[1];
    }
  }

  // === 提取正文内容（使用括号计数正确处理嵌套 div）===
  let content = '';

  // 方式1: js_content div
  content = extractDivContent(html, /<div[^>]*id="js_content"[^>]*>/i);
  if (content) {
    // 移除 style 标签
    content = content.replace(/<style\b[\s\S]*?<\/style>/gi, '');
  }

  // 方式2: rich_media_content div
  if (!content) {
    content = extractDivContent(html, /<div[^>]*class="[^"]*rich_media_content[^"]*"[^>]*>/i);
    if (content) {
      content = content.replace(/<style\b[\s\S]*?<\/style>/gi, '');
    }
  }

  if (!content) {
    throw new Error('无法提取文章正文内容，请确认链接是有效的公众号文章。可尝试在微信中打开文章后，复制"在浏览器中打开"的链接。');
  }

  // === 清理内容 ===
  // 移除 script 标签
  content = content.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  // 移除微信隐藏元素（visibility:hidden 和 display:none）
  content = content.replace(/<[^>]*style="[^"]*visibility\s*:\s*hidden[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, '');
  content = content.replace(/<[^>]*style="[^"]*display\s*:\s*none[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, '');
  // 清理空的块级标签
  content = content.replace(/<(p|div|span|section)[^>]*>\s*<\/\1>/gi, '');
  // 解码 HTML 实体
  content = decodeEntities(content);

  // === 改写图片 URL 为代理 ===
  content = rewriteContentImages(content);

  // 如果没有提取到封面图，尝试从正文第一张图片获取
  if (!coverImage) {
    const firstImg = content.match(/<img[^>]+src="([^"]+)"/i);
    if (firstImg) coverImage = firstImg[1];
  }

  // 封面图也走代理
  coverImage = proxyImageUrl(coverImage);

  // === 安全过滤 ===
  content = sanitizeRichContent(content);

  return {
    title,
    summary,
    coverImage,
    sourceName,
    content,
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

    // 抓取并解析
    const html = await fetchWechatArticle(url);

    // 检测微信是否返回了验证页面而不是文章内容
    if (html.includes('请输入验证码') || html.includes('环境异常') || html.includes('请在微信客户端打开')) {
      return NextResponse.json({
        success: false,
        error: '微信返回了验证页面。请在微信中打开文章 → 点击右上角"..." → 选择"在浏览器中打开" → 复制浏览器中的链接后再试。',
      }, { status: 400 });
    }

    const article = parseWechatHtml(html);

    if (!article.title || !article.content) {
      return NextResponse.json(
        { success: false, error: '无法解析文章内容' },
        { status: 400 }
      );
    }

    if (autoCreate && categoryId) {
      let slug = generateSlug(article.title);
      const existing = await queryOne('SELECT id FROM articles WHERE slug = ?', [slug]);
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }
      const sourceNote = article.sourceName ? `\n\n<p style="color:#999;font-size:14px;">来源：公众号「${article.sourceName}」</p>` : '';

      const result = await execute(
        `INSERT INTO articles (title, slug, summary, content, cover_image, category_id, author, tags, is_featured, is_exclusive, is_banner, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 'draft')`,
        [
          sanitizeInput(article.title),
          slug,
          article.summary,
          article.content + sourceNote,
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
