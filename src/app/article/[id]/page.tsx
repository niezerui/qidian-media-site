import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { query, queryOne } from '@/lib/db';
import { cleanContent, extractFirstImage } from '@/lib/security';
import { siteConfig } from '@/lib/site.config';
import { getImageUrl, rewriteContentImages } from '@/lib/image';
import { boostViewCount, formatViews } from '@/lib/viewBoost';
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
    article.view_count = boostViewCount(article);

    const related = await query(
      `SELECT a.id, a.title, a.slug, a.cover_image, a.category_id, a.author, a.tags, a.is_featured, a.is_banner, a.view_count, a.published_at, a.status, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id WHERE a.category_id = ? AND a.id != ? AND (a.status IS NULL OR a.status = 'published') ORDER BY a.published_at DESC LIMIT 3`,
      [article.category_id, article.id]
    );

    return {
      article,
      related: related.map((r: any) => ({ ...r, view_count: boostViewCount(r), tags: JSON.parse(r.tags || '[]') })),
    };
  } catch { return null; }
}

// 文章页启用 ISR（浏览量由客户端 ViewTracker 递增、评论客户端加载，SSR 缓存安全）
// 60s 后台增量刷新：新发布/编辑的内容 1 分钟内可见
export const revalidate = 60;

/**
 * 预生成文章页，让路由进入 ISR 而不是每次请求都跑 Serverless Function。
 *
 * ⚠️ 为什么必须有它：App Router 中动态段如果没有 generateStaticParams，
 * 路由会被标记为 ƒ(Dynamic)，每次都执行函数且不写 Full Route Cache。
 * 结果是每篇文章的每次访问都消耗「函数调用 + 带宽」配额，
 * 2026-10-23 账号被 Vercel 暂停（402 DEPLOYMENT_DISABLED）正是由此累积。
 *
 * 只预生成最近 60 篇（构建时长可控），其余由 dynamicParams 按需生成并缓存。
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const rows = await query(
      `SELECT slug FROM articles
       WHERE (status IS NULL OR status = 'published') AND slug IS NOT NULL AND slug != ''
       ORDER BY published_at DESC LIMIT 60`
    );
    return rows.map((r: any) => ({ id: String(r.slug) }));
  } catch {
    // 构建期拿不到数据库时返回空：全部走按需 ISR，不影响可用性
    return [];
  }
}

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
      types: {
        // llms.txt 规范：本页的 Markdown 版本（同 URL 加 .md）
        'text/markdown': `/article/${params.id}.md`,
        'text/plain': '/llms.txt',
      },
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
        {/* Sticky Hero Cover：向上滚动时封面固定，下方白底内容遮挡它 */}
        {coverImg && (
          <div
            className="sticky top-[67px] md:top-[115px] w-full h-[50vh] sm:h-[55vh] min-h-[300px] max-h-[540px] overflow-hidden -z-10"
          >
            <img src={getImageUrl(coverImg)} alt={article.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
          </div>
        )}

        {/* 文章内容：白底向上滑动并遮挡封面 */}
        <article className="relative z-10 bg-white mt-[-60px] sm:mt-[-80px]">
          <div className="site-container pt-8 pb-12">
            <div className="max-w-3xl mx-auto">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: 'var(--c-text-3)' }}>
                <Link href="/" className="hover:underline">首页</Link><span>/</span>
                <Link href={`/category/${article.category_slug}`} className="hover:underline">{article.category_name}</Link>
              </nav>

              {/* 文章头部 */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  {article.category_name && (
                    <span className="text-xs px-2.5 py-1 font-bold bg-gold-grad">{article.category_name}</span>
                  )}
                  {article.is_exclusive && <span className="text-xs px-2.5 py-1 font-bold bg-gold-grad">独家</span>}
                  <span className="w-px h-4 mx-1" style={{ backgroundColor: 'var(--c-border)' }} />
                  <span className="text-xs" style={{ color: 'var(--c-text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>{article.category_slug.toUpperCase()}</span>
                </div>
                <h1 className="text-[28px] sm:text-[42px] font-black leading-[1.35] mb-5" style={{ color: '#000000' }}>{article.title}</h1>

                {/* Meta 行 */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm py-4 border-y" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-3)' }}>
                  <span className="font-bold flex items-center gap-2" style={{ color: '#000' }}>
                    <span className="w-[6px] h-[15px] bg-gold-grad" />
                    {article.author || siteConfig.name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
                    {date}
                  </span>
                  {article.view_count > 0 && (
                    <span className="flex items-center gap-1 text-[var(--c-accent)]">
                      <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {formatViews(article.view_count)} 阅读
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="article-body" dangerouslySetInnerHTML={{ __html: article.content }} />

              {/* Tags */}
              {article.tags.length > 0 && (
                <div className="mt-10 pt-6 border-t" style={{ borderColor: 'var(--c-border)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-[6px] h-[15px] bg-gold-grad" />
                    <span className="text-sm font-black" style={{ color: '#000' }}>本文标签</span>
                    <span className="text-[10px] font-bold pt-px text-gold-grad" style={{ letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>TAGS</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((t: string) => (
                      <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="px-3 py-1.5 text-xs border border-[var(--c-border)] text-[var(--c-text-2)] transition-colors hover:bg-[var(--c-accent-bright)] hover:text-black hover:border-[var(--c-accent-bright)]">
                        #{t}
                      </Link>
                    ))}
                  </div>
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
          </div>
        </article>

        {/* Related */}
        {related.length > 0 && (
          <section className="relative z-10 bg-white site-container pb-16">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-2.5 pt-6 mb-5">
                <span className="w-[7px] h-[18px] bg-gold-grad" />
                <h2 className="text-lg font-black leading-[1.5]" style={{ color: '#000' }}>相关文章</h2>
                <span className="text-[10px] font-bold pt-px text-gold-grad" style={{ letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>RELATED</span>
                <div className="flex-1 h-px line-gold-grad" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {related.map((r: any) => (
                  <Link key={r.id} href={`/article/${r.slug}`} className="group block">
                    {r.cover_image && <div className="aspect-[16/10] overflow-hidden mb-3" style={{ backgroundColor: 'var(--c-surface)' }}><img src={getImageUrl(r.cover_image)} alt="" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" /></div>}
                    <h3 className="text-sm font-bold line-clamp-2 leading-[1.5] group-hover:opacity-80 transition-opacity" style={{ color: '#000000' }}>{r.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-xs" style={{ color: 'var(--c-text-3)', fontFamily: 'var(--font-mono)' }}>
                      <span>{r.category_name}</span>
                      <span>·</span>
                      <span>{new Date(r.published_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
                    </div>
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
