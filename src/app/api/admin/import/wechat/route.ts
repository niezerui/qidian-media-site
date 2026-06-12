import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { execute, query, queryOne } from '@/lib/db';
import { sanitizeRichContent, generateSlug, sanitizeInput } from '@/lib/security';

/**
 * 抓取公众号文章内容
 * 支持 mp.weixin.qq.com 的普通文章链接
 */
async function fetchWechatArticle(url: string) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`请求失败: HTTP ${response.status}`);
  }

  return response.text();
}

/**
 * 从HTML中提取公众号文章信息
 */
function parseWechatHtml(html: string) {
  // 提取标题（多种方式尝试）
  let title = '';
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  if (titleMatch) title = titleMatch[1];
  if (!title) {
    const h1Match = html.match(/<h1[^>]*class="[^"]*rich_media_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) title = h1Match[1].replace(/<[^>]+>/g, '').trim();
  }
  if (!title) {
    const tMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
    if (tMatch) title = tMatch[1].trim();
  }
  title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  // 提取封面图
  let coverImage = '';
  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (ogImage) coverImage = ogImage[1];

  // 提取摘要
  let summary = '';
  const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
  if (!ogDesc) {
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
    if (descMatch) summary = descMatch[1];
  } else {
    summary = ogDesc[1];
  }
  summary = summary.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  // 提取公众号名称
  let sourceName = '';
  const profileMatch = html.match(/var\s+nickname\s*=\s*"([^"]+)"/i);
  if (!profileMatch) {
    const profileMatch2 = html.match(/<strong[^>]*class="[^"]*profile_nickname[^"]*"[^>]*>([\s\S]*?)<\/strong>/i);
    if (profileMatch2) sourceName = profileMatch2[1].trim();
  } else {
    sourceName = profileMatch[1];
  }

  // 提取正文内容
  let content = '';

  // 方式1: js_content div
  const jsContentMatch = html.match(/<div[^>]*id="js_content"[^>]*>([\s\S]*?)<\/div>\s*(?:<script|<div[^>]*id="js_pc_qr)/i);
  if (jsContentMatch) {
    content = jsContentMatch[1];
  }

  // 方式2: rich_media_content div
  if (!content) {
    const rmMatch = html.match(/<div[^>]*class="[^"]*rich_media_content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<\/div>\s*<div[^>]*id="js_pc_qr)/i);
    if (rmMatch) content = rmMatch[1];
  }

  // 方式3: 更宽松的匹配
  if (!content) {
    const rmMatch2 = html.match(/<div[^>]*id="js_content"[^>]*>([\s\S]*?)<\/div>/i);
    if (rmMatch2) content = rmMatch2[1];
  }

  if (!content) {
    throw new Error('无法提取文章正文内容，请确认链接是有效的公众号文章');
  }

  // 处理懒加载图片：data-src → src
  content = content.replace(/data-src=/g, 'src=');

  // 处理图片 URL（可能是 // 开头的协议相对 URL）
  content = content.replace(/src="\/\//g, 'src="https://');

  // 移除 style 标签但保留内联样式
  content = content.replace(/<style\b[^<]*<\/style>/gi, '');

  // 移除 script 标签
  content = content.replace(/<script\b[^<]*<\/script>/gi, '');

  // 移除微信特有的不可见元素
  content = content.replace(/<[^>]*style="[^"]*visibility:\s*hidden[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, '');
  content = content.replace(/<[^>]*style="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/[^>]+>/gi, '');

  // 清理空标签
  content = content.replace(/<(\w+)[^>]*>\s*<\/\1>/g, '');

  // 清理多余的 &nbsp;
  content = content.replace(/&nbsp;/g, ' ');

  // 解码 HTML 实体
  content = content.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

  // 如果没有提取到封面图，尝试从正文第一张图片获取
  if (!coverImage) {
    const firstImg = content.match(/<img[^>]+src="([^"]+)"/i);
    if (firstImg) coverImage = firstImg[1];
  }

  // 安全过滤内容
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
    const autoCreate = body.autoCreate !== false; // 默认自动创建
    const categoryId = body.category_id ? parseInt(body.category_id) : null;

    if (!url) {
      return NextResponse.json(
        { success: false, error: '请输入公众号文章链接' },
        { status: 400 }
      );
    }

    // 验证是公众号链接
    if (!url.includes('mp.weixin.qq.com') && !url.includes('weixin.qq.com')) {
      return NextResponse.json(
        { success: false, error: '请粘贴有效的微信公众号文章链接（mp.weixin.qq.com）' },
        { status: 400 }
      );
    }

    // 抓取并解析
    const html = await fetchWechatArticle(url);
    const article = parseWechatHtml(html);

    if (!article.title || !article.content) {
      return NextResponse.json(
        { success: false, error: '无法解析文章内容' },
        { status: 400 }
      );
    }

    // 如果自动创建，直接保存到数据库
    if (autoCreate && categoryId) {
      let slug = generateSlug(article.title);
      // 检查 slug 是否重复
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

      // 获取新创建的 article
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

    // 否则只返回提取的内容，由前端决定
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
