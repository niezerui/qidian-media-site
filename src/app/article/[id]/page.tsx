import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { query, queryOne } from '@/lib/db';
import { cleanContent, extractFirstImage } from '@/lib/security';
import { siteConfig } from '@/lib/site.config';
import { getImageUrl, rewriteContentImages } from '@/lib/image';
import ViewTracker from '@/components/ViewTracker';
import CommentSection from '@/components/CommentSection';
import ShareBar from '@/components/ShareBar';

const SITE_URL = 'https://www.qidianyanjiushe.com';

async function getArticle(slug: string) {
  try {
    const article = await queryOne(
      `SELECT a.*, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id WHERE a.slug = ?`, [slug]
    ) as any;
    if (!article) return null;
    // rewriteContentImages 对外链图片走代理，不再需要 cleanContent（保存时已 sanitize）
    article.content = rewriteContentImages(article.content || '');
    article.tags = JSON.parse(article.tags || '[]');
    // SQLite 返回整数 0/1，转成布尔值，防止 JSX 中 {0 && <Comp>} 渲染出 "0"
    article.is_exclusive = !!article.is_exclusive;
    article.is_featured = !!article.is_featured;
    article.is_banner = !!article.is_banner;

    const related = await query(
      `SELECT a.*, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id WHERE a.category_id = ? AND a.id != ? AND (a.status IS NULL OR a.status = 'published') ORDER BY a.published_at DESC LIMIT 3`,
      [article.category_id, article.id]
    );

    return {
      article,
      related: related.map((r: any) => ({ ...r, tags: JSON.parse(r.tags || '[]') })),
    };
  } catch { return null; }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const data = await getArticle(params.id);
  if (!data) return { title: '404' };
  const { article } = data;
  const rawCover = article.cover_image || extractFirstImage(article.content);

  // OG Image：无论图片来源，统一走 /api/og-image 端点（自动处理 base64 解码和外链代理）
  const articleOghref = `${SITE_URL}/api/og-image?slug=${encodeURIComponent(params.id)}`;
  // 必须有封面图才走文章专用端点，否则用站点 logo 作为兜底（保证微信卡片始终有图）
  const ogImageUrl = rawCover ? articleOghref : `${SITE_URL}/logo.png`;
  const ogImageMeta = {
    url: ogImageUrl,
    width: rawCover ? 1200 : 512,
    height: rawCover ? 630 : 512,
    alt: article.title,
    // 微信爬虫额外需要 secure_url（部分场景）
    ...(rawCover ? {} : { type: 'image/png' } as any),
  };

  return {
    title: `${article.title} | ${siteConfig.name}`,
    description: article.summary || article.title,
    keywords: Array.isArray(article.tags) ? article.tags : [],
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.summary || article.title,
      url: `${SITE_URL}/article/${params.id}`,
      locale: 'zh_CN',
      siteName: siteConfig.name,
      publishedTime: article.published_at,
      authors: [article.author],
      images: [ogImageMeta],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.summary || article.title,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `${SITE_URL}/article/${params.id}`,
    },
  };
}

export default async function ArticleDetailPage({ params }: { params: { id: string } }) {
  const data = await getArticle(params.id);
  if (!data) notFound();

  const { article, related } = data;
  const date = new Date(article.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  const coverImg = article.cover_image || extractFirstImage(article.content);

  // JSON-LD 文章结构化数据
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.summary || article.title,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    author: { '@type': 'Person', name: article.author },
    publisher: {
      '@type': 'NewsMediaOrganization',
      name: siteConfig.name,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/article/${params.id}` },
    image: coverImg ? [coverImg] : [],
    keywords: Array.isArray(article.tags) ? article.tags.join(',') : '',
    articleSection: article.category_name,
    inLanguage: 'zh-CN',
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main className="flex-1">
        <article className="site-container py-8">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: 'var(--c-text-3)' }}>
              <Link href="/" className="hover:underline">首页</Link><span>/</span>
              <Link href={`/category/${article.category_slug}`} className="hover:underline">{article.category_name}</Link><span>/</span>
              <span className="truncate max-w-[200px]" style={{ color: 'var(--c-text-2)' }}>{article.title}</span>
            </nav>

            {/* Tags */}
            <div className="flex items-center gap-2 mb-3">
              {article.is_exclusive && <span className="text-xs px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--c-accent)' }}>独家</span>}
              {article.category_name && <span className="text-xs px-2.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-text-2)' }}>{article.category_name}</span>}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-4" style={{ color: 'var(--c-text)' }}>{article.title}</h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 text-sm pb-6 border-b mb-6" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-3)' }}>
              <span className="font-medium" style={{ color: 'var(--c-text-2)' }}>{article.author}</span>
              <span>{date}</span>
            </div>

            {/* Cover */}
            {coverImg && (
              <div className="mb-8 rounded-xl overflow-hidden">
                <img src={getImageUrl(coverImg)} alt={article.title} className="w-full object-cover" />
              </div>
            )}

            {/* Content */}
            <div className="article-body" dangerouslySetInnerHTML={{ __html: article.content }} />

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t" style={{ borderColor: 'var(--c-border)' }}>
                {article.tags.map((t: string) => <span key={t} className="px-3 py-1 text-xs rounded-full" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-text-2)' }}>#{t}</span>)}
              </div>
            )}

            {/* Share Bar */}
            <ShareBar
              title={article.title}
              summary={article.summary}
              coverImage={coverImg && !coverImg.startsWith('data:') ? coverImg : undefined}
              slug={params.id}
            />

            {/* Comment Section */}
            <CommentSection articleId={article.id} />
          </div>
        </article>

        {/* Related */}
        {related.length > 0 && (
          <section className="site-container pb-12">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-lg font-bold mb-4 pt-6 border-t" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text)' }}>相关文章</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related.map((r: any) => (
                  <Link key={r.id} href={`/article/${r.slug}`} className="group block bg-white rounded-lg border p-3 hover:shadow-sm transition-shadow" style={{ borderColor: 'var(--c-border)' }}>
                    {r.cover_image && <div className="aspect-[16/9] rounded-md overflow-hidden mb-2" style={{ backgroundColor: 'var(--c-surface)' }}><img src={getImageUrl(r.cover_image)} alt="" className="w-full h-full object-cover" /></div>}
                    <h3 className="text-sm font-medium line-clamp-2" style={{ color: 'var(--c-text)' }}>{r.title}</h3>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <ViewTracker articleId={article.id} />
      <Footer />
    </>
  );
}
