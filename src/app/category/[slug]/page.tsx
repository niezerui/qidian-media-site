import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import FlashNews from '@/components/FlashNews';
import { notFound } from 'next/navigation';

const CATEGORY_NAMES: Record<string, string> = {
  '24h-news': '24小时快讯',
  'retail-ecommerce': '零售电商',
  'mobile-digital': '手机数码',
  'ai-llm': 'AI大模型',
  'embodied-ai': '具身智能',
  'ai-hardware': 'AI硬件',
  'ai-applications': 'AI应用',
  'ip-gaming': 'IP游戏',
};

async function getCategoryData(slug: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const [articlesRes, flashesRes] = await Promise.all([
      fetch(`${baseUrl}/api/articles?category=${slug}&pageSize=20`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/flashes?pageSize=5`, { cache: 'no-store' }),
    ]);

    const [articlesData, flashesData] = await Promise.all([
      articlesRes.json(),
      flashesRes.json(),
    ]);

    return {
      articles: articlesData.success ? articlesData.data : [],
      flashes: flashesData.success ? flashesData.data : [],
      total: articlesData.total || 0,
    };
  } catch (error) {
    return { articles: [], flashes: [], total: 0 };
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const name = CATEGORY_NAMES[params.slug];
  if (!name) return { title: '分类未找到' };

  return {
    title: name,
    description: `奇点 - ${name}相关的科技商业深度报道`,
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const name = CATEGORY_NAMES[params.slug];
  if (!name) notFound();

  const { articles, flashes, total } = await getCategoryData(params.slug);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Category Header */}
        <div className="border-b border-brand-100 bg-brand-50">
          <div className="content-container py-8">
            <h1 className="text-3xl font-bold text-brand-900">{name}</h1>
            <p className="text-brand-500 mt-2">共 {total} 篇内容</p>
          </div>
        </div>

        <div className="content-container py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Articles */}
            <div className="lg:col-span-2">
              {articles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {articles.map((article: any) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-brand-400 text-lg">该分类暂无内容</p>
                  <p className="text-brand-400 text-sm mt-2">敬请期待更多精彩内容</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside>
              <FlashNews items={flashes} />
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
