import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { notFound } from 'next/navigation';

async function getFlashNews(id: string) {
  try {
    const vercelUrl = process.env.VERCEL_URL;
    const base = vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000';
    const data = await fetch(`${base}/api/flashes?pageSize=200`, { cache: 'no-store' }).then(r => r.json());
    if (data.success) return data.data.find((f: any) => f.id === parseInt(id)) || null;
    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }) {
  const flash = await getFlashNews(params.id);
  if (!flash) return { title: '快讯未找到' };

  return {
    title: flash.title,
    description: flash.title,
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
        <article className="content-container py-8">
          <div className="max-w-3xl mx-auto">
            <nav className="flex items-center gap-2 text-sm text-brand-400 mb-6">
              <Link href="/" className="hover:text-brand-900 transition-colors">首页</Link>
              <span>/</span>
              <Link href="/category/24h-news" className="hover:text-brand-900 transition-colors">24小时快讯</Link>
              <span>/</span>
              <span className="text-brand-600">{flash.date_label}</span>
            </nav>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-sm font-medium text-accent">快讯</span>
              <time className="text-sm text-brand-400">{formattedDate}</time>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-brand-900 leading-snug mb-8">
              {flash.title}
            </h1>

            {flash.content && (
              <div
                className="article-body"
                dangerouslySetInnerHTML={{ __html: flash.content }}
              />
            )}

            <div className="mt-12 pt-8 border-t border-brand-100">
              <Link
                href="/category/24h-news"
                className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回快讯列表
              </Link>
            </div>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
