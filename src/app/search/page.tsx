import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import SectionHeading from '@/components/SectionHeading';
import ContactCard from '@/components/ContactCard';
import { query } from '@/lib/db';
import { boostViewCount } from '@/lib/viewBoost';

const ARTICLE_COLS = `a.id, a.title, a.slug, a.summary, a.cover_image, a.category_id, a.author, a.tags, a.is_featured, a.is_exclusive, a.is_banner, a.view_count, a.published_at, a.status, c.slug as category_slug, c.name as category_name`;

function parseArticle(a: any) {
  return { ...a, view_count: boostViewCount(a), tags: JSON.parse(a.tags || '[]'), is_featured: !!a.is_featured, is_exclusive: !!a.is_exclusive };
}

export const metadata: Metadata = {
  title: '搜索',
  description: '搜索奇点研究社的文章',
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q || '').trim();
  let articles: any[] = [];
  if (q) {
    try {
      articles = (await query(
        `SELECT ${ARTICLE_COLS} FROM articles a JOIN categories c ON a.category_id = c.id
         WHERE (a.status IS NULL OR a.status = 'published')
           AND (a.title LIKE ? OR a.summary LIKE ? OR a.content LIKE ?)
         ORDER BY a.published_at DESC LIMIT 50`,
        [`%${q}%`, `%${q}%`, `%${q}%`]
      )).map(parseArticle);
    } catch { articles = []; }
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="site-container pt-5 lg:pt-7 pb-12 lg:pb-16">
          {/* 搜索提示条 */}
          <div className="mb-6 px-4 py-3 border text-sm flex items-center gap-2 border-[var(--c-border)] text-[var(--c-text-2)]">
            <span className="w-[6px] h-4 bg-gold-grad" />
            搜索 “<b className="text-black">{q || '（空）'}</b>” 的结果 · 共 {articles.length} 篇
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
            <div className="lg:col-span-8">
              <SectionHeading zh={q ? '搜索结果' : '搜索'} en="SEARCH" />
              {articles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-9 mt-5">
                  {articles.map((a: any) => <ArticleCard key={a.id} article={a} variant="default" />)}
                </div>
              ) : (
                <div className="text-center py-20" style={{ color: 'var(--c-text-3)' }}>
                  {q ? `没有找到与"${q}"相关的内容` : '请输入关键词搜索'}
                </div>
              )}
            </div>
            <aside className="lg:col-span-4">
              <ContactCard />
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
