import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/lib/site.config';
import { getArticles, getFlashes } from '@/lib/data';

const CATEGORY_NAMES: Record<string, string> = {};
siteConfig.categories.forEach(c => { CATEGORY_NAMES[c.slug] = c.name; });

async function getCategoryData(slug: string) {
  try {
    const [articlesRes, flashesRes] = await Promise.all([
      getArticles({ category: slug, pageSize: 20 }),
      getFlashes({ pageSize: siteConfig.homepage.flashCount }),
    ]);
    return { articles: articlesRes.data, flashes: flashesRes.data, total: articlesRes.total };
  } catch { return { articles: [], flashes: [], total: 0 }; }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const name = CATEGORY_NAMES[params.slug];
  if (!name) return { title: '分类未找到' };
  return { title: name, description: `奇点 - ${name}相关的科技商业深度报道` };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const name = CATEGORY_NAMES[params.slug];
  if (!name) notFound();
  const { articles, flashes, total } = await getCategoryData(params.slug);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="border-b border-brand-100 bg-brand-50">
          <div className="content-container py-8">
            <h1 className="text-3xl font-bold text-brand-900">{name}</h1>
            <p className="text-brand-500 mt-2">共 {total} 篇内容</p>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              {articles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {articles.map((article: any) => <ArticleCard key={article.id} article={article} />)}
                </div>
              ) : (
                <div className="text-center py-16"><p className="text-brand-400 text-lg">该分类暂无内容</p></div>
              )}
            </div>

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

              {/* Contact */}
              <div className="bg-brand-900 rounded-xl p-5 text-white">
                <h3 className="text-xs font-bold mb-2 uppercase tracking-wider opacity-70">联系{siteConfig.name}</h3>
                <p className="text-xs text-brand-300 leading-relaxed mb-3">{siteConfig.slogan}。欢迎投稿、爆料、商务合作。</p>
                <div className="space-y-1.5 mb-3">
                  <p className="text-xs text-brand-400">{siteConfig.contact.editorEmail}</p>
                  <p className="text-xs text-brand-400">{siteConfig.contact.bizEmail}</p>
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
