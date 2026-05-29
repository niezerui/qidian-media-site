import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';
import { query } from '@/lib/db';
import { cleanContent, extractFirstImage } from '@/lib/security';

const NAV_CATS = siteConfig.categories;

function parseArticle(a: any) {
  return { ...a, content: cleanContent(a.content || ''), cover_image: a.cover_image || extractFirstImage(a.content), tags: JSON.parse(a.tags || '[]'), is_featured: !!a.is_featured, is_exclusive: !!a.is_exclusive };
}

async function getHomeData(search?: string) {
  try {
    const [banners, featured, articles, flashes] = await Promise.all([
      query(`SELECT a.*, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id WHERE a.is_banner = 1 ORDER BY a.published_at DESC LIMIT 5`),
      query(`SELECT a.*, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id WHERE a.is_featured = 1 ORDER BY a.published_at DESC LIMIT 5`),
      query(`SELECT a.*, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id ${search ? "WHERE a.title LIKE ? OR a.summary LIKE ?" : ""} ORDER BY a.is_featured DESC, a.published_at DESC LIMIT 12`, search ? [`%${search}%`, `%${search}%`] : []),
      query('SELECT * FROM flash_news ORDER BY published_at DESC LIMIT 10'),
    ]);
    return { banners: banners.map(parseArticle).slice(0, 3), featured: featured.map(parseArticle), articles: articles.map(parseArticle), flashes, search };
  } catch { return { banners: [], featured: [], articles: [], flashes: [], search }; }
}

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: { search?: string } }) {
  const sq = searchParams.search;
  const { banners, featured, articles, flashes } = await getHomeData(sq);
  const mainFeatured = featured[0];
  const subFeatured = featured.slice(1, 4);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Category Nav */}
        <div className="border-b" style={{ borderColor: 'var(--c-border)' }}>
          <div className="site-container py-2.5">
            <div className="flex items-center gap-5 overflow-x-auto scrollbar-hide text-sm">
              <Link href="/" className="font-bold whitespace-nowrap border-b-2 pb-1.5 transition-colors"
                style={{ color: 'var(--c-text)', borderColor: 'var(--c-accent)' }}>推荐</Link>
              {NAV_CATS.map(cat => (
                <Link key={cat.slug} href={`/category/${cat.slug}`}
                  className="whitespace-nowrap pb-1.5 border-b-2 border-transparent hover:border-current transition-colors"
                  style={{ color: 'var(--c-text-2)' }}>{cat.name}</Link>
              ))}
            </div>
          </div>
        </div>

        <div className="site-container py-6">
          {sq && <div className="mb-6 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-text-2)' }}>
            搜索 &ldquo;<b>{sq}</b>&rdquo; 的结果
          </div>}

          {/* Banner */}
          {!sq && banners.length > 0 && (
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {banners.map((b: any, i: number) => (
                  <Link key={b.id} href={`/article/${b.slug}`} className="group block rounded-xl overflow-hidden relative"
                    style={{ backgroundColor: 'var(--c-surface)' }}>
                    {b.cover_image && (
                      <div className="aspect-[16/10] overflow-hidden">
                        <img src={b.cover_image} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div className={b.cover_image
                      ? 'absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent'
                      : 'p-4'}>
                      {b.category_name && <span className="text-xs px-2 py-0.5 rounded-full mb-2 inline-block"
                        style={{ backgroundColor: b.cover_image ? 'rgba(255,255,255,0.2)' : 'var(--c-surface)', color: b.cover_image ? '#fff' : 'var(--c-text-2)' }}>{b.category_name}</span>}
                      <h2 className="text-lg font-bold leading-snug line-clamp-2" style={{ color: b.cover_image ? '#fff' : 'var(--c-text)' }}>{b.title}</h2>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* LEFT: Articles (75%) */}
            <div className="lg:col-span-3">
              {!sq && mainFeatured && <div className="mb-6"><ArticleCard article={mainFeatured} variant="featured" /></div>}
              {!sq && subFeatured.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  {subFeatured.map((a: any) => <ArticleCard key={a.id} article={a} variant="compact" />)}
                </div>
              )}

              <div className="flex items-center justify-between mb-4 pt-2 border-t" style={{ borderColor: 'var(--c-border)' }}>
                <h2 className="text-lg font-bold" style={{ color: 'var(--c-text)' }}>{sq ? '搜索结果' : '最新报道'}</h2>
              </div>

              {articles.length > 0 ? (
                <div className="border-t" style={{ borderColor: 'var(--c-border)' }}>
                  {articles.map((a: any) => <ArticleCard key={a.id} article={a} variant="list" />)}
                </div>
              ) : (
                <div className="text-center py-20" style={{ color: 'var(--c-text-3)' }}>{sq ? `没有找到与"${sq}"相关的内容` : '暂无内容'}</div>
              )}
            </div>

            {/* RIGHT: Flash + Contact */}
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
                  <div className="space-y-0.5 max-h-[500px] overflow-y-auto">
                    {flashes.slice(0, 10).map((f: any) => (
                      <Link key={f.id} href={`/flash/${f.id}`} className="block py-1.5 border-b last:border-0 hover:opacity-70 transition-opacity text-xs leading-relaxed"
                        style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}>
                        <span className="line-clamp-2">{f.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--c-surface)' }}>
                <h3 className="text-sm font-bold mb-2 pb-2" style={{ color: 'var(--c-text)', borderBottom: '2px solid var(--c-primary)' }}>联系{siteConfig.name}</h3>
                <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--c-text-2)' }}>{siteConfig.slogan}</p>
                <p className="text-xs" style={{ color: 'var(--c-text-3)' }}>{siteConfig.contact.editorEmail}</p>
                <p className="text-xs" style={{ color: 'var(--c-text-3)' }}>{siteConfig.contact.bizEmail}</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
