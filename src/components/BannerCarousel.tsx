'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getImageUrl } from '@/lib/image';

interface BannerItem {
  id: number; title: string; slug: string; cover_image: string | null;
  category_name?: string; tags?: string[];
}

/** 编辑部分隔线式指示器（数量 = banner 数量，直角条状，金色渐变激活态） */
function BarDots({ total, current, onChange }: { total: number; current: number; onChange: (i: number) => void }) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          aria-label={`第 ${i + 1} 张`}
          className="h-[3px] transition-all duration-300"
          style={{
            width: i === current ? 26 : 12,
            background: i === current ? 'linear-gradient(90deg, var(--c-accent-bright), var(--c-accent))' : 'rgba(255,255,255,0.45)',
          }}
        />
      ))}
    </div>
  );
}

export default function BannerCarousel({ items }: { items: BannerItem[] }) {
  const [current, setCurrent] = useState(0);

  const prev = useCallback(() => setCurrent(c => (c - 1 + items.length) % items.length), [items.length]);
  const next = useCallback(() => setCurrent(c => (c + 1) % items.length), [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next, items.length]);

  if (!items.length) return null;

  const b = items[current];
  const cover = getImageUrl(b.cover_image || '');
  const hasCover = !!b.cover_image;

  return (
    <div className="relative group overflow-hidden select-none" style={{ backgroundColor: '#000000' }}>
      {/* 封面 / 占位 */}
      <Link href={`/article/${b.slug}`} className="block">
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {hasCover ? (
            <img
              src={cover}
              alt={b.title}
              className="w-full h-full object-cover opacity-95 group-hover:scale-[1.03] transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-end" style={{ backgroundColor: '#0d0d0d' }} />
          )}

          {/* 渐变层：底部深、顶部轻 */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.30) 42%, rgba(0,0,0,0.05) 100%)' }} />

          {/* 左上：分类标签 + tags */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5">
            {b.category_name && (
              <span className="text-[11px] font-bold px-2.5 py-1 bg-gold-grad text-black">
                {b.category_name}
              </span>
            )}
            {b.tags && b.tags.slice(0, 2).map((t: string) => (
              <span key={t} className="hidden sm:inline-block text-[11px] px-2.5 py-1"
                style={{ backgroundColor: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.85)' }}>{t}</span>
            ))}
          </div>

          {/* 右上：编号 01/03 */}
          {items.length > 1 && (
            <span className="absolute top-4 right-4 text-xs font-bold text-gold-grad" style={{ fontFamily: 'var(--font-mono)' }}>
              {String(current + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </span>
          )}

          {/* 底部信息 */}
          <div className="absolute inset-x-0 bottom-0 px-4 pb-4 sm:px-6 sm:pb-5">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-lg sm:text-2xl lg:text-[26px] font-black leading-[1.5] text-white line-clamp-2 max-w-[78%]">
                {b.title}
              </h2>
              <BarDots total={items.length} current={current} onChange={setCurrent} />
            </div>
            {/* 阅读引导 */}
            <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-gold-grad">
              阅读全文
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>

      {/* 左右箭头 */}
      {items.length > 1 && (
        <>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 hover:bg-[var(--c-accent)] hover:text-black"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#fff' }} aria-label="上一张">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 hover:bg-[var(--c-accent)] hover:text-black"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)', color: '#fff' }} aria-label="下一张">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
    </div>
  );
}
