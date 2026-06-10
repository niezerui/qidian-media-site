import { query } from '@/lib/db';
import { siteConfig } from '@/lib/site.config';

const SITE_URL = 'https://www.qidianyanjiushe.com';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap() {
  const now = new Date().toISOString();

  // 静态页
  const staticPages = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'hourly' as const, priority: 1.0 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.3 },
  ];

  // 分类页
  const categoryPages = siteConfig.categories.map(c => ({
    url: `${SITE_URL}/category/${c.slug}`,
    lastModified: now,
    changeFrequency: 'hourly' as const,
    priority: 0.8,
  }));

  // 文章页
  let articlePages: any[] = [];
  try {
    const articles = await query(
      `SELECT slug, updated_at, published_at FROM articles WHERE (status IS NULL OR status = 'published') ORDER BY published_at DESC LIMIT 1000`
    );
    articlePages = articles.map((a: any) => ({
      url: `${SITE_URL}/article/${a.slug}`,
      lastModified: (a.updated_at || a.published_at || now),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {}

  // 快讯页
  let flashPages: any[] = [];
  try {
    const flashes = await query(
      `SELECT id, published_at FROM flash_news ORDER BY published_at DESC LIMIT 500`
    );
    flashPages = flashes.map((f: any) => ({
      url: `${SITE_URL}/flash/${f.id}`,
      lastModified: (f.published_at || now),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));
  } catch {}

  return [...staticPages, ...categoryPages, ...articlePages, ...flashPages];
}
