'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface FlashItem {
  id: number;
  title: string;
  date_label?: string;
  published_at?: string;
}

interface FlashTickerProps {
  items: FlashItem[];
}

export default function FlashTicker({ items }: FlashTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const scrollPosRef = useRef(0);

  const scroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      animFrameRef.current = requestAnimationFrame(scroll);
      return;
    }
    scrollPosRef.current += 0.5;
    if (scrollPosRef.current >= maxScroll) {
      scrollPosRef.current = 0;
    }
    el.scrollLeft = scrollPosRef.current;
    animFrameRef.current = requestAnimationFrame(scroll);
  }, []);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(scroll);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [scroll]);

  if (!items.length) return null;

  return (
    <div
      className="flex items-center gap-3 border overflow-hidden"
      style={{ borderColor: 'var(--c-border)' }}
    >
      <div className="flex-shrink-0 px-4 py-2.5 font-bold text-sm" style={{ backgroundColor: 'var(--c-primary)', color: '#fff' }}>
        快讯
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden scrollbar-hide"
        style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
      >
        <div className="flex items-center gap-8 whitespace-nowrap py-2.5 pr-8">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/flash/${item.id}`}
              className="text-sm hover:opacity-60 transition-opacity flex items-center gap-2"
              style={{ color: 'var(--c-text)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#ef4444' }} />
              {item.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
