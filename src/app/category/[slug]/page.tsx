import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import FlashFeed from '@/components/FlashFeed';
import FlashList from '@/components/FlashList';
import SectionHeading from '@/components/SectionHeading';
import ContactCard from '@/components/ContactCard';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/lib/site.config';
import { query, queryOne } from '@/lib/db';
import { boostViewCount } from '@/lib/viewBoost';

const NAME_MAP: Record<string, string> = {};
siteConfig.categories.forEach(c => NAME_MAP[c.slug] = c.name);

// 分类名：优先静态表，数据库新增的分类动态查库（否则新分类页会 404 / 标题显示"分类"）
async function getCategoryName(slug: string): Promise<string> {
  if (slug === '24h-news') return '24小时快讯';
  if (NAME_MAP[slug]) return NAME_MAP[slug];
  try {
    const row = await queryOne('SELECT name FROM categories WHERE slug = ?', [slug]) as any;
    if (row?.name) return row.name;
  } catch { /* 查库失败按未知分类处理 */ }
  return '';
}

// 列表展示所需列（排除 content 大字段）
const ARTICLE_COLS = `a.id, a.title, a.slug, a.summary, a.cover_image, a.category_id, a.author, a.tags, a.is_featured, a.is_exclusive, a.is_banner, a.view_count, a.published_at, a.status, c.slug as category_slug, c.name as category_name`;

// 列表卡片 parse（无 content，封面缺失则不显示图）
function parseCard(a: any) {
  return { ...a, view_count: boostViewCount(a), tags: JSON.parse(a.tags || '[]'), is_featured: !!a.is_featured, is_exclusive: !!a.is_exclusive };
}

async function getCatData(slug: string) {
  try {
    if (slug === '24h-news') {
      const flashes = await query('SELECT * FROM flash_news ORDER BY published_at DESC LIMIT 20');
      const [{ count }] = await query('SELECT COUNT(*) as count FROM flash_news') as any;
      return { isFlash: true, flashes, total: count, hasMore: count > 20 };
    }
    const [articles, flashes, countRows] = await Promise.all([
      query(`SELECT ${ARTICLE_COLS} FROM articles a JOIN categories c ON a.category_id = c.id WHERE c.slug = ? AND (a.status IS NULL OR a.status = 'published') ORDER BY a.published_at DESC LIMIT 20`, [slug]),
      query('SELECT * FROM flash_news ORDER BY published_at DESC LIMIT 30'),
      query(`SELECT COUNT(*) as count FROM articles a JOIN categories c ON a.category_id = c.id WHERE c.slug = ? AND (a.status IS NULL OR a.status = 'published')`, [slug]),
    ]);
    const [{ count }] = countRows as any;
    return { articles: articles.map(parseCard), flashes, total: count || articles.length, hasMore: false };
  } catch { return { articles: [], flashes: [], total: 0, hasMore: false }; }
}

export const revalidate = 60;

/**
 * 预生成所有分类页，让路由进入 ISR（否则动态段会被标记为 ƒ(Dynamic)，
 * 每次访问都执行 Serverless Function，持续消耗函数调用与带宽配额）。
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const rows = await query(
      'SELECT slug FROM categories ORDER BY (sort_order IS NULL), sort_order, id'
    );
    const slugs = rows.map((r: any) => String(r.slug)).filter(Boolean);
    // 静态配置里的分类也一并预生成，避免数据库异常时漏页
    for (const c of siteConfig.categories) {
      if (!slugs.includes(c.slug)) slugs.push(c.slug);
    }
    return Array.from(new Set(slugs)).map((slug) => ({ slug }));
  } catch {
    return siteConfig.categories.map((c) => ({ slug: c.slug }));
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const name = await getCategoryName(params.slug);
  return {
    title: `${name} | ${siteConfig.name}`,
    description: `${siteConfig.name}${name}频道，提供最新科技商业资讯`,
    alternates: {
      canonical: `https://www.qidianyanjiushe.com/category/${params.slug}`,
      types: {
        // llms.txt 规范：本页的 Markdown 版本
        'text/markdown': `/category/${params.slug}.md`,
        'text/plain': '/llms.txt',
      },
    },
  };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const name = await getCategoryName(params.slug);
  const slugIsFlash = params.slug === '24h-news';
  if (!slugIsFlash && !name) notFound();

  const data = await getCatData(params.slug) as any;
  const articles = data.articles || [];
  const flashes = data.flashes || [];
  const isFlash = slugIsFlash || data.isFlash;
  const hasMore = data.hasMore || false;

  const titleEn = (params.slug === '24h-news' ? '24H NEWS' : params.slug.toUpperCase().replace(/-/g, ' '));

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="site-container pt-5 lg:pt-7 pb-12 lg:pb-16">
          {/* 分类页头 */}
          <div className="mb-6 lg:mb-8">
            <div className="flex items-center gap-3">
              <span className="w-[10px] h-[26px] bg-gold-grad" />
              <h1 className="text-2xl sm:text-[32px] font-black leading-none" style={{ color: '#000000', letterSpacing: '0.02em' }}>{name}</h1>
              <span className="text-[10px] sm:text-xs font-bold pt-1 text-gold-grad" style={{ letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>{titleEn}</span>
              <span className="hidden sm:inline-block text-sm" style={{ color: 'var(--c-text-3)' }}>
                {isFlash ? `共 ${data.total ?? 0} 条` : `共 ${data.total ?? 0} 篇`}
              </span>
            </div>
            <div className="mt-4 h-px w-full line-gold-grad" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2">
              {isFlash ? (
                <FlashList initialItems={flashes} initialHasMore={hasMore} />
              ) : articles.length > 0 ? (
                <div>
                  {articles.map((a: any) => <ArticleCard key={a.id} article={a} variant="list" />)}
                </div>
              ) : (
                <div className="text-center py-20" style={{ color: 'var(--c-text-3)' }}>该分类暂无内容</div>
              )}
            </div>

            <aside className="lg:col-span-1 space-y-6">
              {!isFlash && flashes.length > 0 && (
                <FlashFeed items={flashes.slice(0, 30)} visibleCount={10} speed={0.15} />
              )}
              <ContactCard />
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
