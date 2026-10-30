import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { query, queryOne } from '@/lib/db';

async function getFlashNews(id: string) {
  try { return await queryOne('SELECT * FROM flash_news WHERE id = ?', [parseInt(id)]); }
  catch { return null; }
}

// 快讯详情启用 ISR：快讯一旦发布内容不再变化，60s 后台刷新即可
export const revalidate = 60;

/**
 * 预生成快讯详情页，让路由进入 ISR（否则动态段为 ƒ(Dynamic)，每次访问都跑函数）。
 * 只预生成最近 100 条，更早的由 dynamicParams 按需生成并缓存。
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const rows = await query(
      'SELECT id FROM flash_news ORDER BY published_at DESC LIMIT 100'
    );
    return rows.map((r: any) => ({ id: String(r.id) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const flash = await getFlashNews(params.id);
  if (!flash) return { title: '快讯未找到' };

  return {
    title: `${flash.title} | 奇点快讯`,
    description: flash.title,
    alternates: { canonical: `https://www.qidianyanjiushe.com/flash/${params.id}` },
    openGraph: {
      type: 'article',
      title: flash.title,
      description: flash.title,
      publishedTime: flash.published_at,
    },
  };
}

export default async function FlashDetailPage({ params }: { params: { id: string } }) {
  const flash = await getFlashNews(params.id);
  if (!flash) notFound();

  const formattedDate = new Date(flash.published_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <Header />
      <main className="flex-1">
        <article className="site-container pt-6 pb-14">
          <div className="max-w-3xl mx-auto">
            <nav className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--c-text-3)' }}>
              <Link href="/" className="hover:underline">首页</Link>
              <span>/</span>
              <Link href="/category/24h-news" className="hover:underline">24小时快讯</Link>
            </nav>

            {/* 头部标签行 */}
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-xs px-2.5 py-1 font-bold flex items-center gap-1.5" style={{ backgroundColor: 'var(--c-accent)', color: '#000' }}>
                <span className="w-1.5 h-1.5 bg-[#ef4444] animate-pulse" />
                快讯
              </span>
              {flash.date_label && (
                <span className="text-xs px-2.5 py-1 font-bold border" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}>{flash.date_label}</span>
              )}
              {flash.source && (
                <span className="text-xs px-2.5 py-1 border" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-3)' }}>
                  来源：{flash.source}
                  {flash.source_url && (
                    <a href={flash.source_url} target="_blank" rel="noopener noreferrer" className="ml-1.5 font-bold underline" style={{ color: '#000' }}>原文 ↗</a>
                  )}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-[32px] font-black leading-[1.5] mb-6" style={{ color: '#000000' }}>
              {flash.title}
            </h1>

            <div className="flex items-center gap-3 text-sm pb-6 border-b mb-8" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-3)', fontFamily: 'var(--font-mono)' }}>
              <span>{formattedDate}</span>
              <span>·</span>
              <span>QIDIAN NEWS</span>
            </div>

            {flash.content && (
              <div
                className="article-body"
                dangerouslySetInnerHTML={{ __html: flash.content }}
              />
            )}

            <div className="mt-12 pt-8 border-t flex items-center justify-between" style={{ borderColor: 'var(--c-border)' }}>
              <Link
                href="/category/24h-news"
                className="inline-flex items-center gap-2 text-sm font-bold transition-colors hover:opacity-60"
                style={{ color: '#000' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回快讯列表
              </Link>
              <span className="text-xs" style={{ color: 'var(--c-text-3)', fontFamily: 'var(--font-mono)' }}>24H / FLASH</span>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
