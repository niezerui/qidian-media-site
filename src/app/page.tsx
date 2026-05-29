import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import FlashNews from '@/components/FlashNews';
import Link from 'next/link';

const CATEGORIES = [
  { slug: 'retail-ecommerce', name: '零售电商' },
  { slug: 'mobile-digital', name: '手机数码' },
  { slug: 'ai-llm', name: 'AI大模型' },
  { slug: 'embodied-ai', name: '具身智能' },
  { slug: 'ai-hardware', name: 'AI硬件' },
  { slug: 'ai-applications', name: 'AI应用' },
  { slug: 'ip-gaming', name: 'IP游戏' },
];

async function getHomeData(searchQuery?: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const [featuredRes, articlesRes, flashesRes] = await Promise.all([
      fetch(`${baseUrl}/api/articles?featured=1&pageSize=5`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/articles?pageSize=12${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/flashes?pageSize=8`, { cache: 'no-store' }),
    ]);
    const [featuredData, articlesData, flashesData] = await Promise.all([
      featuredRes.json(), articlesRes.json(), flashesRes.json(),
    ]);
    return {
      featured: featuredData.success ? featuredData.data : [],
      articles: articlesData.success ? articlesData.data : [],
      flashes: flashesData.success ? flashesData.data : [],
      total: articlesData.total || 0,
      searchQuery,
    };
  } catch {
    return { featured: [], articles: [], flashes: [], total: 0, searchQuery };
  }
}

export const dynamic = 'force-dynamic';

export default async function HomePage({ searchParams }: { searchParams: { search?: string } }) {
  const searchQuery = searchParams.search;
  const { featured, articles, flashes, searchQuery: sq } = await getHomeData(searchQuery);
  const mainFeatured = featured.length > 0 ? featured[0] : null;
  const subFeatured = featured.slice(1, 4);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Category Quick Nav */}
        <div className="border-b border-brand-100 bg-white">
          <div className="content-container py-3">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
              <a href="/" className="px-3 py-1.5 text-sm font-medium text-brand-900 bg-brand-50 rounded-md whitespace-nowrap">推荐</a>
              {CATEGORIES.map(cat => (
                <a key={cat.slug} href={`/category/${cat.slug}`} className="px-3 py-1.5 text-sm text-brand-500 hover:text-brand-900 hover:bg-brand-50 rounded-md transition-colors whitespace-nowrap">{cat.name}</a>
              ))}
            </div>
          </div>
        </div>

        <div className="content-container py-8">
          {sq && <div className="mb-6 p-4 bg-brand-50 rounded-lg"><p className="text-sm text-brand-600">搜索 &ldquo;<strong>{sq}</strong>&rdquo; 的结果</p></div>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ===== LEFT: Article List ===== */}
            <div className="lg:col-span-2 space-y-8">
              {!sq && mainFeatured && <ArticleCard article={mainFeatured} variant="featured" />}

              {!sq && subFeatured.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {subFeatured.map((article: any) => <ArticleCard key={article.id} article={article} variant="compact" />)}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-brand-100">
                <h2 className="text-xl font-bold text-brand-900">{sq ? '搜索结果' : '最新报道'}</h2>
              </div>

              {articles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {articles.map((article: any) => <ArticleCard key={article.id} article={article} />)}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-brand-400 text-lg">{sq ? `没有找到与"${sq}"相关的结果` : '暂无内容'}</p>
                </div>
              )}
            </div>

            {/* ===== RIGHT: Flash News + Contact ===== */}
            <aside className="space-y-5">
              {/* 24h Flash News */}
              <div className="bg-brand-50 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                    <h2 className="text-sm font-bold text-brand-900">24小时快讯</h2>
                  </div>
                  <Link href="/category/24h-news" className="text-xs text-brand-400 hover:text-brand-700">全部 →</Link>
                </div>
                <div className="space-y-2">
                  {flashes.slice(0, 6).map((item: any) => (
                    <Link key={item.id} href={`/flash/${item.id}`} className="block py-2 border-b border-brand-100 last:border-0 hover:bg-white/60 -mx-1 px-1 rounded transition-colors">
                      <p className="text-xs text-brand-700 line-clamp-2 leading-relaxed">{item.title}</p>
                      <span className="text-[10px] text-brand-400 mt-1 block">{item.date_label || new Date(item.published_at).toLocaleDateString('zh-CN', { month:'short', day:'numeric' })}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-brand-900 rounded-xl p-5 text-white">
                <h3 className="text-xs font-bold mb-2 uppercase tracking-wider opacity-70">联系奇点</h3>
                <p className="text-xs text-brand-300 leading-relaxed mb-3">
                  聚焦AI、科技与商业的深度媒体平台。欢迎投稿、爆料、商务合作。
                </p>
                <div className="space-y-1.5 mb-3">
                  <p className="text-xs text-brand-400">📧 editor@qidian.news</p>
                  <p className="text-xs text-brand-400">🤝 biz@qidian.news</p>
                </div>
                <Link href="/contact" className="inline-flex items-center gap-1.5 text-xs text-white border border-white/30 rounded-md px-3 py-1.5 hover:bg-white/10 transition-colors">
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
