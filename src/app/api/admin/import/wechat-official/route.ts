import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sanitizeRichContent, generateSlug } from '@/lib/security';
import { rewriteContentImages } from '@/lib/image';

// 复用 access_token 获取逻辑（与 wechat-articles 相同）
async function getAccessToken(): Promise<string | null> {
  const config = await queryOne('SELECT app_id, app_secret, access_token, token_expires_at FROM wechat_config WHERE id = 1');
  if (!config) return null;
  if (config.access_token && config.token_expires_at && config.token_expires_at > Date.now() + 5 * 60 * 1000) {
    return config.access_token;
  }
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(config.app_id)}&secret=${encodeURIComponent(config.app_secret)}`
  );
  const data = await res.json();
  if (data.errcode) return null;
  await execute(
    'UPDATE wechat_config SET access_token = ?, token_expires_at = ? WHERE id = 1',
    [data.access_token, Date.now() + data.expires_in * 1000]
  );
  return data.access_token;
}

// 导入指定文章
export async function POST(req: NextRequest) {
  const admin = await getAuthUser();
  if (!admin) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });

  const { mediaId, source, categoryId } = await req.json();
  if (!mediaId || !categoryId) return NextResponse.json({ success: false, error: '参数不完整' }, { status: 400 });

  const token = await getAccessToken();
  if (!token) return NextResponse.json({ success: false, error: '无法获取 access_token，请检查配置' }, { status: 400 });

  let article: { title?: string; digest?: string; content?: string; thumb_url?: string; author?: string } = {};

  if (source === 'draft') {
    // 获取草稿全文
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/draft/get?access_token=${token}`, {
      method: 'POST',
      body: JSON.stringify({ media_id: mediaId }),
    });
    const data = await res.json();
    const news = data.content?.news_item?.[0];
    if (news) {
      article = {
        title: news.title,
        digest: news.digest,
        content: news.content,
        thumb_url: news.thumb_url,
        author: news.author,
      };
    }
  } else {
    // 已发表文章：通过 publish_id 获取详情
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/freepublish/get?access_token=${token}&publish_id=${mediaId}`);
    const data = await res.json();
    const news = data.news_item?.[0];
    if (news) {
      article = {
        title: news.title,
        digest: news.digest,
        content: news.content,
        thumb_url: news.cover_url || news.thumb_url,
        author: news.author,
      };
    }
  }

  if (!article.title || !article.content) {
    return NextResponse.json({ success: false, error: '无法获取文章内容，请重试' }, { status: 400 });
  }

  // 处理图片 URL（微信图片走代理）
  const processedContent = rewriteContentImages(article.content || '');
  const safeContent = sanitizeRichContent(processedContent);

  // 生成唯一 slug
  let slug = generateSlug(article.title);
  const existing = await queryOne('SELECT id FROM articles WHERE slug = ?', [slug]);
  if (existing) slug = `${slug}-${Date.now()}`;

  // 保存为草稿
  const cover = article.thumb_url ? rewriteContentImages(`<img src="${article.thumb_url}">`).match(/src="([^"]+)"/)?.[1] || '' : '';
  const sourceNote = `<p style="color:#999;font-size:14px;">来源：微信公众号「${article.author || '奇点研究社'}」</p>`;

  const result = await execute(
    `INSERT INTO articles (title, slug, summary, content, cover_image, category_id, author, tags, status, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', datetime('now'))`,
    [
      article.title,
      slug,
      article.digest || '',
      safeContent + sourceNote,
      cover,
      categoryId,
      article.author || '奇点编辑部',
      '[]',
    ]
  );

  return NextResponse.json({
    success: true,
    data: { articleId: Number(result.lastInsertRowid), title: article.title, slug },
  });
}
