import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import BannerCarousel from '@/components/BannerCarousel';
import FlashFeed from '@/components/FlashFeed';
import SectionHeading from '@/components/SectionHeading';
import ContactCard from '@/components/ContactCard';
import { siteConfig } from '@/lib/site.config';
import { query } from '@/lib/db';
import { getImageUrl } from '@/lib/image';
import { boostViewCount } from '@/lib/viewBoost';
import Link from 'next/link';

// 首页列表所需文章列（刻意排除 content 大字段，避免正文 base64 图拖垮 SSR）
const ARTICLE_COLS = `a.id, a.title, a.slug, a.summary, a.cover_image, a.category_id, a.author, a.tags, a.is_featured, a.is_exclusive, a.is_banner, a.view_count, a.published_at, a.status, c.slug as category_slug, c.name as category_name`;

function parseArticle(a: any) {
  return { ...a, view_count: boostViewCount(a), tags: JSON.parse(a.tags || '[]'), is_featured: !!a.is_featured, is_exclusive: !!a.is_exclusive };
}

function fmtTags(tags: string[]) { return tags.filter(t => t && t.trim()).slice(0, 5).map(t => t.length > 8 ? t.slice(0, 8) : t); }

function pad(n: number) { return String(n).padStart(2, '0'); }

async function getHomeData() {
  try {
    const [banners, featured, articles, flashes] = await Promise.all([
      query(`SELECT ${ARTICLE_COLS} FROM articles a JOIN categories c ON a.category_id = c.id WHERE a.is_banner = 1 AND (a.status IS NULL OR a.status = 'published') ORDER BY a.published_at DESC LIMIT 5`),
      query(`SELECT ${ARTICLE_COLS} FROM articles a JOIN categories c ON a.category_id = c.id WHERE a.is_featured = 1 AND (a.status IS NULL OR a.status = 'published') ORDER BY a.published_at DESC LIMIT 4`),
      query(`SELECT ${ARTICLE_COLS} FROM articles a JOIN categories c ON a.category_id = c.id WHERE (a.status IS NULL OR a.status = 'published') AND (a.is_featured IS NULL OR a.is_featured = 0) ORDER BY a.published_at DESC LIMIT 12`),
      query('SELECT * FROM flash_news ORDER BY published_at DESC LIMIT 50'),
    ]);
    const finalBanners = (banners.length > 0 ? banners : featured.slice(0, 3)).map(parseArticle).slice(0, 3);
    // 精选文章只在 Banner 右侧展示，不出现在"最新报道"列表中
    const featuredIds = new Set(featured.map((f: any) => f.id));
    const filteredArticles = articles.filter((a: any) => !featuredIds.has(a.id)).map(parseArticle);
    return { banners: finalBanners, featured: featured.map(parseArticle), articles: filteredArticles, flashes };
  } catch { return { banners: [], featured: [], articles: [], flashes: [] }; }
}

// ISR：普通访问命中 CDN 缓存秒开，60s 后后台增量重建保持新鲜
export const revalidate = 60;

/** 主编精选 — 单行（编号 + 标题 + 缩略图） */
function FeaturedRow({ article, index }: { article: any; index: number }) {
  return (
    <Link href={`/article/${article.slug}`} className="group flex items-stretch gap-4 py-4 transition-colors">
      {/* 编号 */}
      <span className="flex-shrink-0 text-[26px] font-black leading-none pt-0.5 transition-colors text-[#cfcfcf] group-hover:text-[var(--c-accent)]"
        style={{ fontFamily: 'var(--font-mono)' }}>
        {pad(index + 1)}
      </span>
      {/* 文本 */}
      <div className="flex-1 min-w-0">
        <h3 className="text-[15px] font-bold line-clamp-2 leading-[1.5] mb-1.5 group-hover:opacity-80 transition-opacity" style={{ color: '#000000' }}>
          {article.title}
        </h3>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--c-text-3)' }}>
          {article.category_name && <span className="font-medium" style={{ color: '#000' }}>{article.category_name}</span>}
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {new Date(article.published_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
          </span>
        </div>
      </div>
      {/* 缩略图 */}
      {article.cover_image && (
        <div className="hidden sm:block w-[92px] h-[64px] flex-shrink-0 overflow-hidden" style={{ backgroundColor: 'var(--c-surface)' }}>
          <img src={getImageUrl(article.cover_image)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}
    </Link>
  );
}

export default async function HomePage() {
  const { banners, featured, articles, flashes } = await getHomeData();

  // 热门标签（从最新文章中聚合；文章无 tags 时回退用分类名，保证模块始终有内容）
  const hotTags = (() => {
    const counter = new Map<string, number>();
    [...articles, ...featured, ...banners].forEach((a: any) => {
      const src = (a.tags || []).filter((t: string) => t && t.trim());
      const names = src.length > 0 ? src : (a.category_name ? [a.category_name] : []);
      names.forEach((t: string) => {
        const k = String(t).trim();
        if (k) counter.set(k, (counter.get(k) || 0) + 1);
      });
    });
    return Array.from(counter.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);
  })();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="site-container pt-5 lg:pt-7 pb-12 lg:pb-16">
          {/* ===== Hero：Banner + 主编精选 ===== */}
          {banners.length > 0 && (
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-10 lg:mb-14">
              {/* 左侧大 Banner（无精选时占满全宽） */}
              <div className={featured.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'}>
                <BannerCarousel items={banners} />
              </div>

              {/* 右侧主编精选 */}
              {featured.length > 0 && (
                <aside className="lg:col-span-4 flex flex-col">
                  <SectionHeading zh="主编精选" en="EDITOR'S PICKS" className="mb-1" />
                  <div className="mt-2 flex-1 flex flex-col justify-between divide-y divide-[#e4e4e4]">
                    {featured.slice(0, 3).map((a: any, i: number) => (
                      <FeaturedRow key={a.id} article={a} index={i} />
                    ))}
                  </div>
                </aside>
              )}
            </section>
          )}

          {/* ===== 最新报道 ===== */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* LEFT 主体 */}
            <div className="lg:col-span-8">
              <SectionHeading
                zh="最新报道"
                en="LATEST"
                trailing={
                  <Link
                    href="/articles"
                    className="group flex items-center gap-1 text-[13px] font-bold whitespace-nowrap transition-colors"
                    style={{ color: 'var(--c-text-2)' }}
                  >
                    <span className="group-hover:text-black transition-colors">全部文章</span>
                    <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                }
              />

              {articles.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-9 mt-5">
                    {articles.map((a: any) => <ArticleCard key={a.id} article={a} variant="default" />)}
                  </div>
                  {/* 列表底部：查看全部文章 */}
                  <div className="mt-10 flex justify-center">
                    <Link
                      href="/articles"
                      className="group inline-flex items-center justify-center gap-2 h-12 px-12 border text-sm font-bold tracking-[0.12em] transition-all duration-200 hover:bg-black"
                      style={{ borderColor: '#000000', color: '#000000' }}
                    >
                      <span className="transition-colors group-hover:text-[var(--c-accent-bright)]">查看全部文章</span>
                      <svg className="w-4 h-4 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[var(--c-accent-bright)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center py-20" style={{ color: 'var(--c-text-3)' }}>暂无内容</div>
              )}
            </div>

            {/* RIGHT 侧栏 */}
            <aside className="lg:col-span-4 space-y-8">
              {flashes.length > 0 && (
                <FlashFeed items={flashes.slice(0, 50)} visibleCount={10} speed={0.15} />
              )}

              {/* 热门标签 */}
              {hotTags.length > 0 && (
                <div className="border-b" style={{ borderTop: '2px solid #000000', borderColor: '#efefef' }}>
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #efefef' }}>
                    <div className="flex items-center gap-2">
                      <span className="w-[7px] h-[16px]" style={{ backgroundColor: 'var(--c-accent-bright)' }} />
                      <h3 className="text-base font-black" style={{ color: '#000000' }}>热门标签</h3>
                    </div>
                    <span className="text-[10px] font-bold pt-px" style={{ color: 'var(--c-text-3)', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>TAGS</span>
                  </div>
                  <div className="flex flex-wrap gap-2 px-4 py-4" style={{ backgroundColor: '#ffffff' }}>
                    {hotTags.map(t => (
                      <Link key={t} href={`/search?q=${encodeURIComponent(t)}`}
                        className="text-xs px-3 py-1.5 border font-medium transition-colors hover:bg-[#000000] hover:text-[var(--c-accent-bright)] hover:border-[#000000]"
                        style={{ borderColor: '#e2e2e2', color: '#1a1a1a', backgroundColor: '#ffffff' }}>
                        # {t}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <ContactCard />
            </aside>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
