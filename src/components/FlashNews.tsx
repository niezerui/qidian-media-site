import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';
const c = siteConfig.colors;

interface FlashNewsItem { id: number; title: string; content: string; date_label: string; published_at: string; }

export default function FlashNews({ items }: { items: FlashNewsItem[] }) {
  if (!items.length) return null;
  return (
    <section className="rounded-xl p-6" style={{ backgroundColor: c.surface }}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: c.accent }} />
          <h2 className="text-lg font-bold" style={{ color: c.textPrimary }}>24小时快讯</h2>
        </div>
        <Link href="/category/24h-news" className="text-sm transition-colors flex items-center gap-1" style={{ color: c.textSecondary }}>
          查看全部
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </Link>
      </div>
      <div className="space-y-1">
        {items.map(item => (
          <Link key={item.id} href={`/flash/${item.id}`} className="flex items-start gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-white transition-colors group">
            <time className="text-xs whitespace-nowrap pt-0.5 min-w-[60px]" style={{ color: c.textMuted }}>{item.date_label || new Date(item.published_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</time>
            <h3 className="text-sm transition-colors line-clamp-2 leading-relaxed flex-1" style={{ color: c.textSecondary }}>{item.title}</h3>
            <svg className="w-4 h-4 transition-colors flex-shrink-0 mt-0.5" style={{ color: c.border }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
