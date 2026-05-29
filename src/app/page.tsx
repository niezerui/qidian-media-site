import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';

const c = siteConfig.colors;
const ALL_CATEGORIES = siteConfig.categories;
const NAV_CATEGORIES = ALL_CATEGORIES.filter(cat => cat.slug !== '24h-news');

async function getHomeData(searchQuery?: string) {
  try {
    const vercelUrl = process.env.VERCEL_URL;
    const base = vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000';
    const [fd, ad, fld] = await Promise.all([
      fetch(`${base}/api/articles?featured=1&pageSize=5`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`${base}/api/articles?pageSize=12${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`${base}/api/flashes?pageSize=${siteConfig.homepage.flashCount}`, { cache: 'no-store' }).then(r => r.json()),
    ]);
    return { featured: fd.data || [], articles: ad.data || [], flashes: fld.data || [], total: ad.total || 0, searchQuery };
  } catch { return { featured: [], articles: [], flashes: [], total: 0, searchQuery }; }
}

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: { search?: string } }) {
  const sq = searchParams.search;
  const { featured, articles, flashes } = await getHomeData(sq);
  const mainFeatured = featured.length > 0 ? featured[0] : null;
  const subFeatured = featured.slice(1, 4);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* ===== Category Navigation ===== */}
        <div className="border-b" style={{ borderColor: c.border, backgroundColor: '#fff' }}>
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide py-3">
              <Link href="/" className="text-sm font-bold whitespace-nowrap pb-2 border-b-2 transition-colors"
                style={{ color: c.textPrimary, borderColor: c.accent }}>
                {siteConfig.name}推荐
              </Link>
              {NAV_CATEGORIES.map(cat => (
                <Link key={cat.slug} href={`/category/${cat.slug}`}
                  className="text-sm whitespace-nowrap pb-2 border-b-2 border-transparent hover:border-current transition-colors"
                  style={{ color: c.textSecondary }}>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {sq && <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: c.surface }}><p className="text-sm" style={{ color: c.textSecondary }}>搜索 &ldquo;<strong>{sq}</strong>&rdquo; 的结果</p></div>}

          {/* ===== LAYOUT: Articles (75%) | Sidebar (25%) ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* ===== LEFT: Articles ===== */}
            <div className="lg:col-span-3 space-y-8">
              {!sq && mainFeatured && <ArticleCard article={mainFeatured} variant="featured" />}
              {!sq && subFeatured.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {subFeatured.map((a: any) => <ArticleCard key={a.id} article={a} variant="compact" />)}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: c.border }}>
                <h2 className="text-xl font-bold" style={{ color: c.textPrimary }}>{sq ? '搜索结果' : '最新报道'}</h2>
              </div>

              {articles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {articles.map((a: any) => <ArticleCard key={a.id} article={a} />)}
                </div>
              ) : (
                <div className="text-center py-16"><p className="text-lg" style={{ color: c.textMuted }}>{sq ? `没有找到与"${sq}"相关的结果` : '暂无内容'}</p></div>
              )}
            </div>

            {/* ===== RIGHT: Flash + Contact ===== */}
            <aside className="lg:col-span-1 space-y-5">
              <div className="rounded-xl p-5" style={{ backgroundColor: c.surface }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: c.accent }} />
                    <h2 className="text-sm font-bold" style={{ color: c.textPrimary }}>24小时快讯</h2>
                  </div>
                  <Link href="/category/24h-news" className="text-xs hover:opacity-70" style={{ color: c.textMuted }}>全部 →</Link>
                </div>
                <div className="space-y-2">
                  {flashes.slice(0, siteConfig.homepage.flashCount).map((item: any) => (
                    <Link key={item.id} href={`/flash/${item.id}`} className="block py-2 border-b last:border-0 hover:bg-white/40 -mx-1 px-1 rounded transition-colors" style={{ borderColor: c.border }}>
                      <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: c.textSecondary }}>{item.title}</p>
                      <span className="text-[10px] mt-1 block" style={{ color: c.textMuted }}>{item.date_label || new Date(item.published_at).toLocaleDateString('zh-CN', { month:'short', day:'numeric' })}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-xl p-5 text-white" style={{ backgroundColor: c.footer }}>
                <h3 className="text-xs font-bold mb-2 uppercase tracking-wider opacity-70">联系{siteConfig.name}</h3>
                <p className="text-xs leading-relaxed mb-3 opacity-70">{siteConfig.slogan}。欢迎投稿、爆料、商务合作。</p>
                <div className="space-y-1.5 mb-3">
                  <p className="text-xs opacity-60">{siteConfig.contact.editorEmail}</p>
                  <p className="text-xs opacity-60">{siteConfig.contact.bizEmail}</p>
                </div>
                <Link href="/contact" className="inline-flex items-center gap-1.5 text-xs border border-white/30 rounded-md px-3 py-1.5 hover:bg-white/10 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  发送消息
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
