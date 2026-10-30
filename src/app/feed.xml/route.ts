import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { siteConfig } from '@/lib/site.config';

const SITE_URL = 'https://www.qidianyanjiushe.com';

// RSS 输出无需静态缓存，5 分钟边缘缓存即可
export const dynamic = 'force-dynamic';

/** XML 特殊字符转义 */
function esc(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * GET /feed.xml — RSS 2.0 订阅源（媒体站标配，利于搜索引擎收录与读者订阅）
 * 返回最新 50 篇已发布文章
 */
export async function GET() {
  let items: any[] = [];
  try {
    items = await query(
      `SELECT a.title, a.slug, a.summary, a.published_at, a.updated_at, c.name as category_name
       FROM articles a
       JOIN categories c ON a.category_id = c.id
       WHERE (a.status IS NULL OR a.status = 'published')
       ORDER BY COALESCE(a.published_at, a.created_at) DESC
       LIMIT 50`
    );
  } catch { // 查库失败时输出空频道，保证 feed 可访问
  }

  const itemsXml = items
    .map((a) => {
      const url = `${SITE_URL}/article/${a.slug}`;
      const date = a.updated_at || a.published_at;
      return `    <item>
      <title>${esc(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <category>${esc(a.category_name)}</category>
      <description>${esc(a.summary || a.title)}</description>
      <pubDate>${new Date(date).toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(siteConfig.name)} - ${esc(siteConfig.seo.defaultTitle)}</title>
    <link>${SITE_URL}</link>
    <description>${esc(siteConfig.slogan)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}
