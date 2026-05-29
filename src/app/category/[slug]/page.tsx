import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/lib/site.config';
import { query } from '@/lib/db';
import { cleanContent, extractFirstImage } from '@/lib/security';

const NAME_MAP: Record<string, string> = {};
siteConfig.categories.forEach(c => NAME_MAP[c.slug] = c.name);

function parseArticle(a: any) {
  return { ...a, content: cleanContent(a.content || ''), cover_image: a.cover_image || extractFirstImage(a.content), tags: JSON.parse(a.tags || '[]') };
}

async function getCatData(slug: string) {
  try {
    const [articles, flashes] = await Promise.all([
      query(`SELECT a.*, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id WHERE c.slug = ? ORDER BY a.published_at DESC LIMIT 20`, [slug]),
      query('SELECT * FROM flash_news ORDER BY published_at DESC LIMIT 6'),
    ]);
    return { articles: articles.map(parseArticle), flashes, total: articles.length };
  } catch { return { articles: [], flashes: [], total: 0 }; }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const name = NAME_MAP[params.slug] || '分类';
  return { title: `${name} | ${siteConfig.name}` };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const name = NAME_MAP[params.slug];
  if (!name) notFound();
  const { articles, flashes, total } = await getCatData(params.slug);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="border-b" style={{ backgroundColor: 'var(--c-surface)', borderColor: 'var(--c-border)' }}>
          <div className="site-container py-6">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--c-text)' }}>{name}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--c-text-3)' }}>共 {total} 篇</p>
          </div>
        </div>

        <div className="site-container py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="lg:col-span-3">
              {articles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {articles.map((a: any) => <ArticleCard key={a.id} article={a} />)}
                </div>
              ) : (
                <div className="text-center py-20" style={{ color: 'var(--c-text-3)' }}>该分类暂无内容</div>
              )}
            </div>

            <aside className="lg:col-span-1 space-y-5">
              {flashes.length > 0 && (
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--c-surface)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--c-accent)' }} />
                      <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>24小时快讯</h3>
                    </div>
                    <Link href="/category/24h-news" className="text-xs hover:underline" style={{ color: 'var(--c-text-3)' }}>全部</Link>
                  </div>
                  {flashes.slice(0, 6).map((f: any) => (
                    <Link key={f.id} href={`/flash/${f.id}`} className="block py-1.5 border-b last:border-0 hover:opacity-70 text-xs"
                      style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}>
                      <span className="line-clamp-2">{f.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
