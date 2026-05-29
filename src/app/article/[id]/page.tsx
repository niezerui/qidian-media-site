import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Link from 'next/link';
import { notFound } from 'next/navigation';

async function getArticle(slug: string) {
  try {
    const vercelUrl = process.env.VERCEL_URL;
    const baseUrl = vercelUrl ? `https://${vercelUrl}` : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000');
    const res = await fetch(`${baseUrl}/api/articles?pageSize=1`, { cache: 'no-store' });
    const data = await res.json();

    if (data.success) {
      const article = data.data.find((a: any) => a.slug === slug);
      if (article) {
        // Get related articles
        const relatedRes = await fetch(
          `${baseUrl}/api/articles?category=${article.category_slug}&pageSize=4`,
          { cache: 'no-store' }
        );
        const relatedData = await relatedRes.json();
        return {
          article,
          related: relatedData.success
            ? relatedData.data.filter((a: any) => a.id !== article.id).slice(0, 3)
            : [],
        };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  // Extract slug from id param
  const slug = params.id;
  const data = await getArticle(slug);
  if (!data) return { title: '文章未找到' };

  return {
    title: data.article.title,
    description: data.article.summary,
    openGraph: {
      title: data.article.title,
      description: data.article.summary,
      type: 'article',
      images: data.article.cover_image ? [data.article.cover_image] : [],
    },
  };
}

export default async function ArticleDetailPage({ params }: { params: { id: string } }) {
  const slug = params.id;
  const data = await getArticle(slug);

  if (!data) notFound();

  const { article, related } = data;
  const formattedDate = new Date(article.published_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <Header />
      <main className="flex-1">
        <article className="content-container py-8">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-brand-400 mb-6">
              <Link href="/" className="hover:text-brand-900 transition-colors">首页</Link>
              <span>/</span>
              <Link href={`/category/${article.category_slug}`} className="hover:text-brand-900 transition-colors">
                {article.category_name}
              </Link>
              <span>/</span>
              <span className="text-brand-600 truncate max-w-[200px]">{article.title}</span>
            </nav>

            {/* Tags */}
            <div className="flex items-center gap-2 mb-4">
              {article.is_exclusive && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-white">独家</span>
              )}
              {article.category_name && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-100 text-brand-600">
                  {article.category_name}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-brand-900 leading-tight mb-6">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-brand-400 pb-8 border-b border-brand-100 mb-8">
              <span className="font-medium text-brand-600">{article.author}</span>
              <span>{formattedDate}</span>
              <span>{article.view_count} 阅读</span>
            </div>

            {/* Cover Image */}
            {article.cover_image && (
              <div className="mb-10 rounded-xl overflow-hidden">
                <img
                  src={article.cover_image}
                  alt={article.title}
                  className="w-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div
              className="article-body"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-12 pt-8 border-t border-brand-100">
                {article.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-xs text-brand-500 bg-brand-50 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Share */}
            <div className="flex items-center gap-4 mt-8 pt-8 border-t border-brand-100">
              <span className="text-sm text-brand-400">分享到：</span>
              <button className="p-2 rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors" aria-label="分享到微信">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.952-7.062-6.122zm-2.18 2.769c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z"/>
                </svg>
              </button>
              <button className="p-2 rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors" aria-label="分享到微博">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.194 14.197c0 3.858-4.851 6.986-10.835 6.986-2.158 0-4.172-.487-5.693-1.29.298.022.6.033.905.033 1.774 0 3.405-.553 4.698-1.482-1.656-.03-3.053-1.074-3.535-2.51.231.036.468.055.711.055.345 0 .68-.04 1-.115-1.731-.34-3.035-1.79-3.035-3.54v-.045c.51.27 1.093.433 1.713.452-1.015-.648-1.683-1.753-1.683-3.005 0-.662.187-1.282.512-1.815 1.865 2.184 4.652 3.622 7.796 3.772-.065-.264-.099-.54-.099-.823 0-1.995 1.693-3.613 3.78-3.613 1.088 0 2.07.439 2.76 1.142.861-.162 1.67-.463 2.4-.878-.282.843-.883 1.55-1.663 1.997.765-.087 1.494-.28 2.172-.567-.507.724-1.149 1.36-1.888 1.867.007.155.01.311.01.468z"/>
                </svg>
              </button>
            </div>

            {/* Author Card */}
            <div className="mt-8 p-6 bg-brand-50 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-900 rounded-full flex items-center justify-center text-white font-bold">
                {article.author.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-brand-900">{article.author}</p>
                <p className="text-xs text-brand-400">奇点编辑部</p>
              </div>
            </div>
          </div>
        </article>

        {/* Related Articles */}
        {related.length > 0 && (
          <section className="bg-brand-50 py-12">
            <div className="content-container">
              <h2 className="text-xl font-bold text-brand-900 mb-6">相关文章</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {related.map((article: any) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
