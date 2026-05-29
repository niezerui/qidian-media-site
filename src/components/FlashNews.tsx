import Link from 'next/link';

interface FlashNewsItem {
  id: number;
  title: string;
  content: string;
  date_label: string;
  published_at: string;
}

interface FlashNewsProps {
  items: FlashNewsItem[];
}

export default function FlashNews({ items }: FlashNewsProps) {
  if (!items.length) return null;

  return (
    <section className="bg-brand-50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          <h2 className="text-lg font-bold text-brand-900">24小时快讯</h2>
        </div>
        <Link
          href="/category/24h-news"
          className="text-sm text-brand-500 hover:text-brand-900 transition-colors flex items-center gap-1"
        >
          查看全部
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/flash/${item.id}`}
            className="flex items-start gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-white transition-colors group"
          >
            <time className="text-xs text-brand-400 whitespace-nowrap pt-0.5 min-w-[60px]">
              {item.date_label || new Date(item.published_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </time>
            <h3 className="text-sm text-brand-700 group-hover:text-brand-900 transition-colors line-clamp-2 leading-relaxed flex-1">
              {item.title}
            </h3>
            <svg className="w-4 h-4 text-brand-300 group-hover:text-brand-600 transition-colors flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
