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
const NAV_CATS = siteConfig.categories;

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

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const name = NAME_MAP[params.slug] || '分类';
  return { title: `${name} | ${siteConfig.name}` };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const name = NAME_MAP[params.slug] || params.slug === '24h-news' ? '24小时快讯' : '';
  const isFlash = params.slug === '24h-news';
  if (!isFlash && !name) notFound();

  const { articles, flashes } = await getCatData(params.slug);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Category Nav */}
        <div className="border-b" style={{ borderColor: 'var(--c-border)' }}>
          <div className="site-container py-2.5">
            <div className="flex items-center gap-5 overflow-x-auto scrollbar-hide text-sm">
              <Link href="/" className="whitespace-nowrap pb-1.5 border-b-2 border-transparent hover:border-current transition-colors" style={{ color: 'var(--c-text-2)' }}>推荐</Link>
              {NAV_CATS.map(cat => (
                <Link key={cat.slug} href={`/category/${cat.slug}`}
                  className={`whitespace-nowrap pb-1.5 border-b-2 transition-colors ${params.slug === cat.slug ? 'font-bold' : 'border-transparent hover:border-current'}`}
                  style={{ color: params.slug === cat.slug ? 'var(--c-text)' : 'var(--c-text-2)', borderColor: params.slug === cat.slug ? 'var(--c-accent)' : 'transparent' }}>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="site-container py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--c-text)' }}>{name || '24小时快讯'}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="lg:col-span-3">
              {isFlash ? (
                flashes.length > 0 ? (
                  <div className="space-y-2">
                    {flashes.map((f: any) => (
                      <Link key={f.id} href={`/flash/${f.id}`}
                        className="block py-3 border-b hover:opacity-70 transition-opacity"
                        style={{ borderColor: 'var(--c-border)', color: 'var(--c-text)' }}>
                        <p className="text-sm">{f.title}</p>
                        <span className="text-xs" style={{ color: 'var(--c-text-3)' }}>{f.date_label || new Date(f.published_at).toLocaleDateString('zh-CN')}</span>
                      </Link>
                    ))}
                  </div>
                ) : <div className="text-center py-20" style={{ color: 'var(--c-text-3)' }}>暂无快讯</div>
              ) : articles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {articles.map((a: any) => <ArticleCard key={a.id} article={a} />)}
                </div>
              ) : (
                <div className="text-center py-20" style={{ color: 'var(--c-text-3)' }}>该分类暂无内容</div>
              )}
            </div>

            <aside className="lg:col-span-1 space-y-5">
              {!isFlash && flashes.length > 0 && (
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
