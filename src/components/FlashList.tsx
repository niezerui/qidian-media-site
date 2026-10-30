'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface FlashItem {
  id: number;
  title: string;
  content?: string;
  date_label?: string;
  published_at?: string;
  source?: string;
  source_url?: string;
}

interface FlashListProps {
  initialItems: FlashItem[];
  initialHasMore: boolean;
}

export default function FlashList({ initialItems, initialHasMore }: FlashListProps) {
  const [items, setItems] = useState<FlashItem[]>(initialItems);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);

  const formatTime = (item: FlashItem) => {
    if (item.date_label) return item.date_label;
    if (item.published_at) {
      return new Date(item.published_at).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return '';
  };

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const res = await fetch(`/api/flashes?page=${nextPage}&limit=20`);
      const data = await res.json();
      if (data.flashes && data.flashes.length > 0) {
        setItems(prev => [...prev, ...data.flashes]);
        setPage(nextPage);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page]);

  if (!items.length) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--c-text-3)' }}>
        暂无快讯
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {items.map((item) => {
        const time = formatTime(item);
        return (
          <div
            key={item.id}
            className="py-5 border-b last:border-b-0 group"
            style={{ borderColor: 'var(--c-border)' }}
          >
            <div className="flex items-center gap-2 mb-2.5">
              {time && (
                <time className="text-xs font-bold px-2 py-0.5" style={{ backgroundColor: 'var(--c-accent)', color: '#000' }}>
                  {time}
                </time>
              )}
              {item.source && (
                <span className="inline-block text-xs px-2 py-0.5 border font-medium"
                  style={{ borderColor: 'var(--c-border)', color: '#777' }}>
                  {item.source}
                </span>
              )}
            </div>

            <Link href={`/flash/${item.id}`} className="block group-hover:opacity-80 transition-opacity">
              <h3 className="text-[17px] font-black leading-[1.5] mb-1.5" style={{ color: '#000000' }}>
                {item.title}
              </h3>
              {item.content && (
                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--c-text-2)' }}>
                  {item.content}
                </p>
              )}
            </Link>

            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold mt-2 hover:opacity-60 transition-opacity"
                style={{ color: '#000' }}
              >
                <span>阅读原文</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        );
      })}

      {hasMore && (
        <div className="flex justify-center pt-7 pb-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-3 text-sm font-black transition-all disabled:opacity-50 bg-gold-grad text-black hover:bg-black hover:text-[var(--c-accent)] border border-transparent hover:border-[var(--c-accent)]"
          >
            {loading ? '加载中…' : '加载更多 ↓'}
          </button>
        </div>
      )}
    </div>
  );
}
