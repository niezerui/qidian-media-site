'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface BannerItem {
  id: number; title: string; slug: string; cover_image: string | null;
  category_name?: string; tags?: string[];
}

export default function BannerCarousel({ items }: { items: BannerItem[] }) {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => {
    setCurrent(c => (c - 1 + items.length) % items.length);
  }, [items.length]);

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, items.length]);

  if (!items.length) return null;

  const b = items[current];

  return (
    <div className="mb-6">
      <div className="relative group rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--c-surface)', maxWidth: 'var(--content-max)' }}>
        <Link href={`/article/${b.slug}`} className="block">
          {b.cover_image ? (
            <>
              <div className="aspect-[21/9] overflow-hidden">
                <img src={b.cover_image} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                {b.category_name && <span className="text-xs px-2 py-0.5 rounded-full mb-2 inline-block" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>{b.category_name}</span>}
                {b.tags && b.tags.length > 0 && b.tags.slice(0, 3).map((t: string) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full mb-2 ml-1 inline-block" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ddd' }}>{t}</span>
                ))}
                <h2 className="text-xl sm:text-2xl font-bold leading-snug text-white">{b.title}</h2>
              </div>
            </>
          ) : (
            <div className="p-6">
              {b.category_name && <span className="text-xs px-2 py-0.5 rounded-full mb-2 inline-block" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-text-2)' }}>{b.category_name}</span>}
              <h2 className="text-xl font-bold leading-snug" style={{ color: 'var(--c-text)' }}>{b.title}</h2>
            </div>
          )}
        </Link>

        {/* Arrows — only visible on hover */}
        {items.length > 1 && (
          <>
            <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: '#fff' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', color: '#fff' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {items.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'w-6' : 'opacity-40'}`}
              style={{ backgroundColor: i === current ? 'var(--c-accent)' : 'var(--c-text-3)' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
