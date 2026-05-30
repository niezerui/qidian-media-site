import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import BannerCarousel from '@/components/BannerCarousel';
import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';
import { query } from '@/lib/db';
import { cleanContent, extractFirstImage } from '@/lib/security';

function parseArticle(a: any) {
  return { ...a, content: cleanContent(a.content || ''), cover_image: a.cover_image || extractFirstImage(a.content), tags: JSON.parse(a.tags || '[]'), is_featured: !!a.is_featured, is_exclusive: !!a.is_exclusive };
}

function fmtTags(tags: string[]) { return tags.filter(t => t && t.trim()).slice(0, 5).map(t => t.length > 8 ? t.slice(0, 8) : t); }

async function getHomeData(search?: string) {
  try {
    const [banners, featured, articles, flashes] = await Promise.all([
      query(`SELECT a.*, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id WHERE a.is_banner = 1 ORDER BY a.published_at DESC LIMIT 5`),
      query(`SELECT a.*, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id WHERE a.is_featured = 1 ORDER BY a.published_at DESC LIMIT 5`),
      query(`SELECT a.*, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id ${search ? "WHERE a.title LIKE ? OR a.summary LIKE ?" : ""} ORDER BY a.is_featured DESC, a.published_at DESC LIMIT 12`, search ? [`%${search}%`, `%${search}%`] : []),
      query('SELECT * FROM flash_news ORDER BY published_at DESC LIMIT 10'),
    ]);
    const finalBanners = (banners.length > 0 ? banners : featured.slice(0, 3)).map(parseArticle).slice(0, 3);
    return { banners: finalBanners, articles: articles.map(parseArticle), flashes, search };
  } catch { return { banners: [], articles: [], flashes: [], search }; }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage({ searchParams }: { searchParams: { search?: string } }) {
  const sq = searchParams.search;
  const { banners, articles, flashes } = await getHomeData(sq);

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Category Nav */}
        <div className="site-container py-6">
          {sq && <div className="mb-6 p-3 rounded-lg text-sm" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-text-2)' }}>
            搜索 &ldquo;<b>{sq}</b>&rdquo; 的结果
          </div>}

          {/* Banner Carousel */}
          {!sq && banners.length > 0 && <BannerCarousel items={banners} />}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* LEFT: Latest articles */}
            <div className="lg:col-span-3">
              <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--c-text)' }}>{sq ? '搜索结果' : '最新报道'}</h2>
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
                    {flashes.map((f: any) => {
                      const ft = f.date_label || (f.published_at ? new Date(f.published_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '');
                      return (
                        <Link key={f.id} href={`/flash/${f.id}`} className="flex items-start gap-2 py-1.5 border-b last:border-0 hover:opacity-70 text-xs"
                          style={{ borderColor: 'var(--c-border)' }}>
                          <span className="flex-1 line-clamp-2 leading-relaxed" style={{ color: 'var(--c-text-2)' }}>{f.title}</span>
                          {ft && <span className="flex-shrink-0 pt-0.5" style={{ color: 'var(--c-text-3)' }}>{ft}</span>}
                        </Link>
                      );
                    })}
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
