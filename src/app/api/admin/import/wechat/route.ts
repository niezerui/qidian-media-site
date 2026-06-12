import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { sanitizeRichContent, generateSlug, sanitizeInput } from '@/lib/security';
import * as cheerio from 'cheerio';

/**
 * 从 HTML 字符串中解析公众号文章内容
 * 支持传 URL（服务端 fetch）或直接传 HTML 字符串（浏览器端抓取后提交）
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthUser();
    if (!admin) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const body = await req.json();
    const { url, html: rawHtml, categoryId, autoCreate } = body;

    let html = rawHtml || '';
    let fetchSource = rawHtml ? '浏览器粘贴' : '服务端抓取';

    // 如果没有传 HTML，则尝试服务端抓取
    if (!rawHtml) {
      if (!url) {
        return NextResponse.json({ success: false, error: '请提供公众号文章链接，或在浏览器中打开文章后复制页面源码粘贴导入' }, { status: 400 });
      }
      const fetchResult = await fetchWechatArticle(url);
      if (!fetchResult.success) {
        return NextResponse.json({
          success: false,
          error: fetchResult.error,
          debug: fetchResult.debug,
          suggestion: '请在浏览器中打开该链接，复制页面源码后使用「粘贴 HTML」模式导入',
        }, { status: 400 });
      }
      html = fetchResult.html;
      fetchSource = '服务端抓取';
    }

    if (!html || html.length < 100) {
      return NextResponse.json({ success: false, error: 'HTML 内容为空或太短，请检查链接是否正确' }, { status: 400 });
    }

    // 用 cheerio 解析
    const article = parseWechatArticle(html, url || '');

    if (!article.content || article.content.length < 50) {
      return NextResponse.json({
        success: false,
        error: `正文提取失败（提取到 ${article.content?.length || 0} 个字符）。\n\n可能原因：\n1. 该文章需要关注公众号才能查看\n2. 文章已删除\n3. HTML 结构异常\n\n建议：在浏览器中打开文章，复制页面源码后手动导入`,
        debug: { title: article.title, contentLength: article.content?.length, cover: article.coverImage?.substring(0, 80) },
      }, { status: 400 });
    }

    // 处理图片 URL（封面 + 正文中的图片走代理）
    const processedContent = rewriteContentImages(article.content);

    // 安全过滤
    const safeContent = sanitizeRichContent(processedContent);

    // 自动创建文章
    if (autoCreate && categoryId) {
      let slug = generateSlug(article.title);
      const existing = await queryOne('SELECT id FROM articles WHERE slug = ?', [slug]);
      if (existing) {
        slug = `${slug}-${Date.now()}`;
      }
      const sourceNote = article.sourceName ? `\n\n<p style="color:#999;font-size:14px;">来源：公众号「${article.sourceName}」</p>` : '';
      const contentToSave = safeContent + sourceNote;

      const result = await execute(
        `INSERT INTO articles (title, slug, content, excerpt, cover_image, category_id, is_exclusive, status, publish_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'draft', datetime('now'), datetime('now'), datetime('now'))`,
        [article.title, slug, contentToSave, article.excerpt || '', article.coverImage || '', categoryId]
      );

      return NextResponse.json({
        success: true,
        message: '文章已导入（草稿）',
        articleId: result.lastInsertRowid,
        preview: { title: article.title, contentLength: contentToSave.length, coverImage: article.coverImage },
        fetchSource,
      });
    }

    // 仅解析，不保存
    return NextResponse.json({
      success: true,
      preview: {
        title: article.title,
        excerpt: article.excerpt,
        coverImage: article.coverImage,
        contentLength: processedContent.length,
        sourceName: article.sourceName,
      },
      html: processedContent,
      fetchSource,
    });
  } catch (error: any) {
    console.error('[Import WeChat] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ========== 服务端抓取 ==========

async function fetchWechatArticle(url: string): Promise<{ success: boolean; html?: string; error?: string; debug?: any }> {
  const strategies = [
    { name: 'Chrome 浏览器', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    { name: '微信内置浏览器', ua: 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/108.0.5359.128 Mobile Safari/537.36 MicroMessenger/8.0.40' },
    { name: 'Safari 浏览器', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' },
  ];

  for (const strategy of strategies) {
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': strategy.ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          'Referer': 'https://mp.weixin.qq.com/',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
      });

      const html = await resp.text();
      const reason = detectVerificationPage(html);

      if (reason) {
        console.log(`[Import] ${strategy.name} 触发验证页: ${reason}`);
        continue;
      }

      if (html.length < 1000) continue;

      // 简单检查是否有文章特征
      const $ = cheerio.load(html);
      const hasTitle = $('meta[property="og:title"]').attr('content');
      const hasContent = $('#js_content').length > 0 || $('.rich_media_content').length > 0;

      if (hasTitle || hasContent) {
        console.log(`[Import] ${strategy.name} 成功获取文章内容 (${html.length} bytes)`);
        return { success: true, html };
      }
    } catch (e: any) {
      console.log(`[Import] ${strategy.name} 失败: ${e.message}`);
    }
  }

  return {
    success: false,
    error: '微信服务器拒绝了抓取请求（触发安全验证）。\n\n解决方法：\n1. 在浏览器中打开该公众号文章链接\n2. 右键 →「查看网页源代码」\n3. 全选复制所有源码\n4. 回到本页面，使用「粘贴 HTML 源码」模式导入',
    debug: { strategiesTried: strategies.map(s => s.name) },
  };
}

// ========== HTML 解析（cheerio）==========

interface WechatArticle {
  title: string;
  excerpt: string;
  coverImage: string;
  content: string;
  sourceName: string;
}

function parseWechatArticle(html: string, sourceUrl: string): WechatArticle {
  const $ = cheerio.load(html);

  // --- 标题 ---
  let title = $('meta[property="og:title"]').attr('content')
    || $('h1.rich_media_title').text()
    || $('title').text()
    || '';
  title = title.trim().replace(/[\n\r]+/g, ' ');

  // --- 封面图：取最后一张 og:image（第一张通常是微信 logo）---
  const ogImages: string[] = [];
  $('meta[property="og:image"]').each((_, el) => {
    const c = $(el).attr('content');
    if (c) ogImages.push(c);
  });
  // 最后一张 og:image 通常是文章封面
  let coverImage = ogImages.length > 0 ? ogImages[ogImages.length - 1] : '';
  // 如果只有一张且是微信 logo，尝试从正文中找第一张图
  if (coverImage && (coverImage.includes('mmbiz.qpic.cn') && ogImages.length === 1)) {
    // 保留，可能是正确的
  }
  // 代理封面图
  if (coverImage && coverImage.includes('mmbiz.qpic.cn')) {
    coverImage = `/api/img-proxy?url=${encodeURIComponent(coverImage)}`;
  }

  // --- 摘要 ---
  let excerpt = $('meta[property="og:description"]').attr('content')
    || $('meta[name="description"]').attr('content')
    || '';
  excerpt = excerpt.trim().substring(0, 200);

  // --- 公众号名称 ---
  let sourceName = '';
  // 尝试多种方式获取公众号名
  const nickname = $('meta[property="og:novel:author"]').attr('content')
    || $('meta[name="author"]').attr('content')
    || '';
  if (nickname) sourceName = nickname;

  // --- 正文内容 ---
  // 策略1: #js_content
  let $content = $('#js_content');
  // 策略2: .rich_media_content
  if (!$content.length) $content = $('.rich_media_content');
  // 策略3: .img-content
  if (!$content.length) $content = $('.img-content');
  // 策略4: 找包含大量文字的 div
  if (!$content.length) {
    $('div').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      if (text.length > 200 && !$content.length) {
        $content = $el;
      }
    });
  }

  let content = '';
  if ($content.length) {
    // 移除不可见元素
    $content.find('[style*="display:none"]').remove();
    $content.find('[style*="display: none"]').remove();
    $content.find('[style*="visibility:hidden"]').remove();
    $content.find('[style*="visibility: hidden"]').remove();
    // 移除样式标签和脚本
    $content.find('style, script, link').remove();
    // 移除空段落
    $content.find('p, section').each((_, el) => {
      const $el = $(el);
      if (!$el.text().trim() && !$el.find('img, video').length) {
        $el.remove();
      }
    });

    content = $content.html() || '';
  }

  // 如果 cheerio 没拿到，用正则兜底
  if (!content || content.length < 50) {
    const regexContent = extractWithRegex(html);
    if (regexContent) content = regexContent;
  }

  // 清理内容
  content = cleanWechatContent(content);

  return { title, excerpt, coverImage, content, sourceName };
}

/** 正则兜底提取（处理 cheerio 没拿到的情况） */
function extractWithRegex(html: string): string {
  // 找 js_content
  const jsMatch = html.match(/<div[^>]*id=["']js_content["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
  if (jsMatch && jsMatch[1].length > 100) return jsMatch[1];

  // 找 rich_media_content
  const richMatch = html.match(/<div[^>]*class=["'][^"']*rich_media_content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (richMatch && richMatch[1].length > 100) return richMatch[1];

  return '';
}

/** 清理微信文章 HTML */
function cleanWechatContent(html: string): string {
  if (!html) return '';

  let cleaned = html;

  // 移除 style 和 script 标签
  cleaned = cleaned.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  // 移除不可见元素（精确匹配）
  cleaned = cleaned.replace(/<[^>]+style=["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '');

  // 移除空标签
  cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/gi, '');
  cleaned = cleaned.replace(/<section[^>]*>\s*<\/section>/gi, '');

  // 移除微信特有属性
  cleaned = cleaned.replace(/\sdata-[a-z-]+=["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s(wxrevtag|richtext|eqrcode)["'\s]/gi, ' ');

  return cleaned.trim();
}

// ========== 图片代理 ==========

function rewriteContentImages(content: string): string {
  if (!content) return '';
  return content.replace(/<img\b[^>]*src=["'](https?:\/\/mmbiz\.qpic\.cn\/[^"']+)["'][^>]*>/gi, (match, src) => {
    const proxyUrl = `/api/img-proxy?url=${encodeURIComponent(src)}`;
    return match.replace(src, proxyUrl);
  });
}

// ========== 验证页检测 ==========

function detectVerificationPage(html: string): string | null {
  // 检查关键结构是否存在（有这些说明是正常文章页）
  const hasArticleStructure = html.includes('js_content') || html.includes('rich_media_content') || html.includes('og:title');
  if (hasArticleStructure) return null;

  // 检测各类异常页面
  if (html.includes('secitptpage') || html.includes('PAGE_MID')) return '安全验证页面';
  if (html.includes('请输入验证码')) return '需要输入验证码';
  if (html.includes('环境异常')) return '微信环境异常';
  if (html.includes('请在微信客户端打开')) return '需要在微信客户端打开';
  if (html.includes('该内容已被发布者删除')) return '文章已删除';
  if (html.includes('此内容因违规无法查看')) return '文章因违规被删除';

  // HTML 太短或无文章特征
  if (html.length < 5000 && !hasArticleStructure) return '返回页面无文章内容';

  return null;
}
