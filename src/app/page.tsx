import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';

const NAV_CATS = siteConfig.categories.filter(c => c.slug !== '24h-news');

async function getHomeData(search?: string) {
  try {
    const base = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    const [fd, ad, fld] = await Promise.all([
      fetch(`${base}/api/articles?featured=1&pageSize=5`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`${base}/api/articles?pageSize=12${search ? `&search=${encodeURIComponent(search)}` : ''}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`${base}/api/flashes?pageSize=6`, { cache: 'no-store' }).then(r => r.json()),
    ]);
    return { featured: fd.data || [], articles: ad.data || [], flashes: fld.data || [], search };
  } catch { return { featured: [], articles: [], flashes: [], search }; }
}

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: { search?: string } }) {
  const sq = searchParams.search;
  const { featured, articles, flashes } = await getHomeData(sq);
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

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* LEFT: Articles */}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {articles.map((a: any) => <ArticleCard key={a.id} article={a} />)}
                </div>
              ) : (
                <div className="text-center py-20" style={{ color: 'var(--c-text-3)' }}>
                  {sq ? `没有找到与"${sq}"相关的内容` : '暂无内容'}
                </div>
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
                  <div className="space-y-1">
                    {flashes.slice(0, 6).map((f: any) => (
                      <Link key={f.id} href={`/flash/${f.id}`} className="block py-1.5 border-b last:border-0 hover:opacity-70 transition-opacity text-xs"
                        style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}>
                        <span className="line-clamp-2">{f.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl p-4 text-white" style={{ backgroundColor: 'var(--c-primary)' }}>
                <h3 className="text-sm font-bold mb-2">联系{siteConfig.name}</h3>
                <p className="text-xs opacity-70 mb-3">{siteConfig.slogan}</p>
                <p className="text-xs opacity-50 mb-1">{siteConfig.contact.editorEmail}</p>
                <p className="text-xs opacity-50">{siteConfig.contact.bizEmail}</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
