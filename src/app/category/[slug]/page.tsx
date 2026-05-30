import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArticleCard from '@/components/ArticleCard';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/lib/site.config';
import { query } from '@/lib/db';
import { cleanContent, extractFirstImage } from '@/lib/security';

const NAME_MAP: Record<string, string> = {};
siteConfig.categories.forEach(c => NAME_MAP[c.slug] = c.name);

function parseArticle(a: any) {
  return { ...a, content: cleanContent(a.content || ''), cover_image: a.cover_image || extractFirstImage(a.content), tags: JSON.parse(a.tags || '[]') };
}

async function getCatData(slug: string) {
  try {
    if (slug === '24h-news') {
      const flashes = await query('SELECT * FROM flash_news ORDER BY published_at DESC LIMIT 50');
      return { isFlash: true, flashes, total: flashes.length };
    }
    const [articles, flashes] = await Promise.all([
      query(`SELECT a.*, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id WHERE c.slug = ? ORDER BY a.published_at DESC LIMIT 20`, [slug]),
      query('SELECT * FROM flash_news ORDER BY published_at DESC LIMIT 10'),
    ]);
    return { articles: articles.map(parseArticle), flashes, total: articles.length };
  } catch { return { articles: [], flashes: [], total: 0 }; }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const name = NAME_MAP[params.slug] || (params.slug === '24h-news' ? '24小时快讯' : '分类');
  return { title: `${name} | ${siteConfig.name}` };
}

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const name = NAME_MAP[params.slug] || (params.slug === '24h-news' ? '24小时快讯' : '');
  const slugIsFlash = params.slug === '24h-news';
  if (!slugIsFlash && !name) notFound();

  const data = await getCatData(params.slug) as any;
  const articles = data.articles || [];
  const flashes = data.flashes || [];
  const isFlash = slugIsFlash || data.isFlash;

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="site-container py-6">
          <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--c-text)' }}>{name || '24小时快讯'}</h1>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            <div className="lg:col-span-3">
              {isFlash ? (
                flashes.length > 0 ? (
                  <div className="space-y-2">
                    {flashes.map((f: any) => (
                      <Link key={f.id} href={`/flash/${f.id}`} className="block py-3 border-b hover:opacity-70 transition-opacity"
                        style={{ borderColor: 'var(--c-border)', color: 'var(--c-text)' }}>
                        <p className="text-sm">{f.title}</p>
                        <span className="text-xs" style={{ color: 'var(--c-text-3)' }}>{f.date_label || new Date(f.published_at).toLocaleDateString('zh-CN')}</span>
                      </Link>
                    ))}
                  </div>
                ) : <div className="text-center py-20" style={{ color: 'var(--c-text-3)' }}>暂无快讯</div>
              ) : articles.length > 0 ? (
                <div className="border-t" style={{ borderColor: 'var(--c-border)' }}>
                  {articles.map((a: any) => <ArticleCard key={a.id} article={a} variant="list" />)}
                </div>
              ) : (
                <div className="text-center py-20" style={{ color: 'var(--c-text-3)' }}>该分类暂无内容</div>
              )}
            </div>

            <aside className="lg:col-span-1 space-y-5">
              {!isFlash && flashes.length > 0 && (
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--c-surface)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--c-accent)' }} />
                      <h3 className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>24小时快讯</h3>
                    </div>
                    <Link href="/category/24h-news" className="text-xs hover:underline" style={{ color: 'var(--c-text-3)' }}>全部</Link>
                  </div>
                  {flashes.slice(0, 10).map((f: any) => (
                    <Link key={f.id} href={`/flash/${f.id}`} className="block py-1.5 border-b last:border-0 hover:opacity-70 text-xs"
                      style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}>
                      <span className="line-clamp-2">{f.title}</span>
                    </Link>
                  ))}
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
