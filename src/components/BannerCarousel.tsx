'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface BannerItem {
  id: number; title: string; slug: string; cover_image: string | null;
  category_name?: string;
}

export default function BannerCarousel({ items }: { items: BannerItem[] }) {
  const [current, setCurrent] = useState(0);

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
      <Link href={`/article/${b.slug}`} className="group block rounded-xl overflow-hidden relative"
        style={{ backgroundColor: 'var(--c-surface)' }}>
        {b.cover_image ? (
          <>
            <div className="aspect-[21/9] overflow-hidden">
              <img src={b.cover_image} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
              {b.category_name && <span className="text-xs px-2 py-0.5 rounded-full mb-2 inline-block" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>{b.category_name}</span>}
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

      {/* Indicator dots */}
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
