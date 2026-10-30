import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import SectionHeading from '@/components/SectionHeading';
import { siteConfig } from '@/lib/site.config';
import { query } from '@/lib/db';
import { boostViewCount } from '@/lib/viewBoost';
import Link from 'next/link';

// 全部文章归档：按发布时间倒序分页（每页 21 篇 = 3列×7行整版铺满），含历史所有已发布文章

const PAGE_SIZE = 21;

// 列表所需文章列（排除 content 大字段，避免 base64 图拖垮 SSR）
const ARTICLE_COLS = `a.id, a.title, a.slug, a.summary, a.cover_image, a.category_id, a.author, a.tags, a.is_featured, a.is_exclusive, a.is_banner, a.view_count, a.published_at, a.status, c.slug as category_slug, c.name as category_name`;

function parseCard(a: any) {
  return { ...a, view_count: boostViewCount(a), tags: JSON.parse(a.tags || '[]'), is_featured: !!a.is_featured, is_exclusive: !!a.is_exclusive };
}

export const revalidate = 60;

export async function generateMetadata() {
  return {
    title: `全部文章 | ${siteConfig.name}`,
    description: `${siteConfig.name}全部文章归档，浏览所有历史报道`,
    alternates: {
      canonical: `https://www.qidianyanjiushe.com/articles`,
      types: {
        // llms.txt 规范：本页的 Markdown 版本
        'text/markdown': '/articles.md',
        'text/plain': '/llms.txt',
      },
    },
  };
}

export default async function ArticlesPage({ searchParams }: { searchParams?: { page?: string } }) {
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1);

  let total = 0;
  let articles: any[] = [];
  try {
    const [countRows, rows] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM articles a WHERE (a.status IS NULL OR a.status = 'published')`),
      query(
        `SELECT ${ARTICLE_COLS}
         FROM articles a JOIN categories c ON a.category_id = c.id
         WHERE (a.status IS NULL OR a.status = 'published')
         ORDER BY a.published_at DESC
         LIMIT ? OFFSET ?`,
        [PAGE_SIZE, (page - 1) * PAGE_SIZE]
      ),
    ]);
    total = Number((countRows as any)?.[0]?.count ?? 0);
    articles = rows.map(parseCard);
  } catch {
    articles = [];
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  // 若页码越界（如删文后），数据已按实际 safePage 查过，这里直接展示并让分页链接收敛
  const pageList = (() => {
    const s = new Set<number>([1, totalPages]);
    for (let i = Math.max(1, safePage - 2); i <= Math.min(totalPages, safePage + 2); i++) s.add(i);
    return Array.from(s).sort((a, b) => a - b);
  })();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="site-container pt-5 lg:pt-7 pb-12 lg:pb-16">
          {/* 页头 */}
          <div className="mb-6 lg:mb-8">
            <div className="flex items-center gap-3">
              <span className="w-[10px] h-[26px] bg-gold-grad" />
              <h1 className="text-2xl sm:text-[32px] font-black leading-none" style={{ color: '#000000', letterSpacing: '0.02em' }}>全部文章</h1>
              <span className="text-[10px] sm:text-xs font-bold pt-1 text-gold-grad" style={{ letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>ARCHIVE</span>
              <span className="hidden sm:inline-block text-sm" style={{ color: 'var(--c-text-3)' }}>共 {total} 篇</span>
            </div>
            <div className="mt-4 h-px w-full line-gold-grad" />
          </div>

          {/* 全部文章分页列表 */}
          {articles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-9">
              {articles.map((a: any) => <ArticleCard key={a.id} article={a} variant="default" />)}
            </div>
          ) : (
            <div className="text-center py-24" style={{ color: 'var(--c-text-3)' }}>暂无文章</div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-1">
              {safePage > 1 && (
                <Link
                  href={safePage - 1 > 1 ? `/articles?page=${safePage - 1}` : '/articles'}
                  className="h-10 px-4 flex items-center text-sm font-bold border transition-colors hover:bg-black hover:text-[var(--c-accent-bright)]"
                  style={{ borderColor: 'var(--c-border)', color: '#000' }}
                >
                  ‹ 上一页
                </Link>
              )}
              {pageList.map((p, idx) => (
                <span key={p} className="flex items-center gap-1">
                  {idx > 0 && p - pageList[idx - 1] > 1 && (
                    <span className="px-1 select-none" style={{ color: 'var(--c-text-3)' }}>…</span>
                  )}
                  <Link
                    href={p > 1 ? `/articles?page=${p}` : '/articles'}
                    className={`w-10 h-10 flex items-center justify-center text-sm font-bold border transition-colors ${
                      p === safePage
                        ? 'bg-black text-[var(--c-accent-bright)]'
                        : 'hover:bg-black hover:text-[var(--c-accent-bright)]'
                    }`}
                    style={p === safePage ? { borderColor: '#000', color: 'var(--c-accent-bright)' } : { borderColor: 'var(--c-border)', color: '#000' }}
                  >
                    {p}
                  </Link>
                </span>
              ))}
              {safePage < totalPages && (
                <Link
                  href={`/articles?page=${safePage + 1}`}
                  className="h-10 px-4 flex items-center text-sm font-bold border transition-colors hover:bg-black hover:text-[var(--c-accent-bright)]"
                  style={{ borderColor: 'var(--c-border)', color: '#000' }}
                >
                  下一页 ›
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
