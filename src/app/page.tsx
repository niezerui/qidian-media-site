import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import FlashNews from '@/components/FlashNews';

const CATEGORIES = [
  { slug: 'retail-ecommerce', name: '零售电商', desc: '零售与电商行业前沿动态' },
  { slug: 'mobile-digital', name: '手机数码', desc: '手机与数码产品一手资讯' },
  { slug: 'ai-llm', name: 'AI大模型', desc: '大语言模型技术前沿' },
  { slug: 'embodied-ai', name: '具身智能', desc: '机器人与具身智能突破' },
  { slug: 'ai-hardware', name: 'AI硬件', desc: 'AI芯片与智能硬件生态' },
  { slug: 'ai-applications', name: 'AI应用', desc: 'AI产品落地与实践' },
  { slug: 'ip-gaming', name: 'IP游戏', desc: '游戏产业与IP动态' },
];

async function getHomeData(searchQuery?: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const [featuredRes, articlesRes, flashesRes] = await Promise.all([
      fetch(`${baseUrl}/api/articles?featured=1&pageSize=5`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/articles?pageSize=12${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/flashes?pageSize=5`, { cache: 'no-store' }),
    ]);

    const [featuredData, articlesData, flashesData] = await Promise.all([
      featuredRes.json(),
      articlesRes.json(),
      flashesRes.json(),
    ]);

    return {
      featured: featuredData.success ? featuredData.data : [],
      articles: articlesData.success ? articlesData.data : [],
      flashes: flashesData.success ? flashesData.data : [],
      total: articlesData.total || 0,
      searchQuery,
    };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return { featured: [], articles: [], flashes: [], total: 0, searchQuery };
  }
}

// Force SSR for SEO
export const dynamic = 'force-dynamic';

export default async function HomePage({
  searchParams,
}: {
  searchParams: { search?: string };
}) {
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
              <a
                href="/"
                className="px-3 py-1.5 text-sm font-medium text-brand-900 bg-brand-50 rounded-md whitespace-nowrap"
              >
                推荐
              </a>
              {CATEGORIES.map((cat) => (
                <a
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="px-3 py-1.5 text-sm text-brand-500 hover:text-brand-900 hover:bg-brand-50 rounded-md transition-colors whitespace-nowrap"
                >
                  {cat.name}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="content-container py-8">
          {/* Search results indicator */}
          {sq && (
            <div className="mb-6 p-4 bg-brand-50 rounded-lg">
              <p className="text-sm text-brand-600">
                搜索 &ldquo;<strong>{sq}</strong>&rdquo; 的结果
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Featured Article */}
              {!sq && mainFeatured && (
                <ArticleCard article={mainFeatured} variant="featured" />
              )}

              {/* Sub Featured */}
              {!sq && subFeatured.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {subFeatured.map((article: any) => (
                    <ArticleCard key={article.id} article={article} variant="compact" />
                  ))}
                </div>
              )}

              {/* Article List Header */}
              <div className="flex items-center justify-between pt-4 border-t border-brand-100">
                <h2 className="text-xl font-bold text-brand-900">
                  {sq ? '搜索结果' : '最新报道'}
                </h2>
                {!sq && (
                  <span className="text-sm text-brand-400">共 {articles.length} 篇</span>
                )}
              </div>

              {/* Article Grid */}
              {articles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {articles.map((article: any) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-brand-400 text-lg">暂无内容</p>
                  {sq && (
                    <p className="text-brand-400 text-sm mt-2">
                      没有找到与 &ldquo;{sq}&rdquo; 相关的结果
                    </p>
                  )}
                </div>
              )}

              {/* Load More */}
              {articles.length >= 12 && (
                <div className="text-center pt-4">
                  <button className="px-8 py-3 text-sm text-brand-600 border border-brand-200 rounded-full hover:bg-brand-50 hover:border-brand-300 transition-colors">
                    加载更多
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Flash News */}
              <FlashNews items={flashes} />

              {/* Latest Articles in Sidebar */}
              {!sq && articles.length > 0 && (
                <div className="bg-white border border-brand-100 rounded-xl p-6">
                  <h3 className="text-sm font-bold text-brand-900 mb-4 uppercase tracking-wider">最新文章</h3>
                  <div className="space-y-0">
                    {articles.slice(0, 8).map((article: any) => (
                      <a
                        key={article.id}
                        href={`/article/${article.slug}`}
                        className="block py-3 border-b border-brand-50 last:border-0 hover:bg-brand-50/50 -mx-2 px-2 rounded transition-colors group"
                      >
                        <h4 className="text-sm text-brand-700 group-hover:text-brand-900 transition-colors line-clamp-2 leading-relaxed">
                          {article.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          {article.category_name && (
                            <span className="text-xs text-brand-400">{article.category_name}</span>
                          )}
                          <span className="text-xs text-brand-300">
                            {new Date(article.published_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* About */}
              <div className="bg-brand-900 rounded-xl p-6 text-white">
                <h3 className="text-sm font-bold mb-3 uppercase tracking-wider">关于奇点</h3>
                <p className="text-sm text-brand-300 leading-relaxed mb-4">
                  奇点是聚焦AI、科技与商业的深度媒体平台。我们追踪智能时代的每一次技术突破，记录产业变革的关键时刻。
                </p>
                <a
                  href="/contact"
                  className="inline-flex items-center gap-2 text-sm text-white border border-white/30 rounded-md px-4 py-2 hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  联系奇点
                </a>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
