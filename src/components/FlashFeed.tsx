'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

interface FlashItem {
  id: number;
  title: string;
  content?: string;
  date_label?: string;
  published_at?: string;
  source?: string;
}

interface FlashFeedProps {
  items: FlashItem[];
  visibleCount?: number;
  speed?: number;
  autoScroll?: boolean;
  showSource?: boolean;
}

export default function FlashFeed({
  items,
  visibleCount = 10,
  speed = 0.4,
  autoScroll = true,
  showSource = false,
}: FlashFeedProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);

  // 按标题去重：同一条新闻可能被多个源收录，轮播里不应重复出现
  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    const out: FlashItem[] = [];
    for (const it of items) {
      const key = (it.title || '').replace(/\s+/g, '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
    return out;
  }, [items]);

  const total = uniqueItems.length;

  // 条目大于 1 条才滚动；只有 1 条时静态展示，避免「反复滚同一条」
  const canScroll = autoScroll && total >= 2;

  // 复制份数：保证「内容总高 ≥ 视口高 + 单份高」，这样滚动到任意位置都有内容，
  // 不会出现滚到空白（原实现只复制 2 份，条目少时内容不足视口就露白）
  const repeatCount = canScroll
    ? Math.min(Math.max(2, Math.ceil(visibleCount / total) + 1), 50)
    : 1;

  const formatTime = (item: FlashItem) => {
    if (item.date_label) return item.date_label;
    if (item.published_at) {
      return new Date(item.published_at).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return '';
  };

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    // 每次数据/参数变化都从顶部重新开始，避免残留偏移
    offsetRef.current = 0;
    el.style.transform = 'translateY(0px)';

    if (!canScroll) return;

    // 单条高度（以实际渲染高度为准，兜底 64）
    const firstChild = el.children[0] as HTMLElement | undefined;
    const itemH = firstChild?.offsetHeight || 64;
    // 单份（一轮原始条目）的高度 —— 以此为循环周期
    const unitH = itemH * total;
    if (unitH <= 0) return;

    const tick = () => {
      if (!hoverRef.current) {
        offsetRef.current += speed;
        // 走完一整份就减掉一份高度：视觉上完全等价，从而无缝、无限循环
        if (offsetRef.current >= unitH) offsetRef.current -= unitH;
        el.style.transform = `translateY(-${offsetRef.current}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [uniqueItems, total, canScroll, repeatCount, speed, visibleCount]);

  if (total === 0) {
    return (
      <div className="text-center py-16" style={{ color: 'var(--c-text-3)' }}>
        <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
        <p className="text-sm">暂无快讯</p>
      </div>
    );
  }

  const itemHeight = 64;
  const viewHeight = visibleCount * itemHeight;

  // 渲染列表：复制 repeatCount 份，配合「按单份高度取模」实现无缝无限循环
  const renderItems: FlashItem[] = [];
  for (let r = 0; r < repeatCount; r++) renderItems.push(...uniqueItems);

  return (
    <div
      className="relative overflow-hidden border-b"
      style={{ borderTop: '2px solid #000000', borderBottomColor: '#efefef' }}
      onMouseEnter={() => { hoverRef.current = true; setPaused(true); }}
      onMouseLeave={() => { hoverRef.current = false; setPaused(false); }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #efefef', backgroundColor: 'var(--c-surface)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-[7px] h-[16px]" style={{ backgroundColor: 'var(--c-accent-bright)' }} />
          <h3 className="text-base font-black" style={{ color: '#000000', letterSpacing: '0.02em' }}>
            24小时快讯
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {/* 悬停暂停的即时反馈：只在滚动时出现 */}
          {canScroll && (
            <span
              className="hidden sm:flex items-center gap-1 text-[11px] font-medium transition-opacity duration-200"
              style={{ color: 'var(--c-text-3)', opacity: paused ? 1 : 0 }}
              aria-hidden={!paused}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5h3v14H8zM13 5h3v14h-3z" />
              </svg>
              已暂停
            </span>
          )}
          <Link href="/category/24h-news" className="group flex items-center gap-1 text-xs font-bold transition-colors text-[var(--c-text-3)] hover:text-[var(--c-accent)]">
            更多
            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Scrollable list — CSS transform 驱动无缝滚动，无下拉条 */}
      <div
        className="overflow-hidden relative"
        style={{ height: `${viewHeight}px`, backgroundColor: '#ffffff' }}
      >
        <div ref={listRef} className="will-change-transform">
          {renderItems.map((item, idx) => {
            const time = formatTime(item);
            // 每份内容的头一条（即最新一条）显示红色脉冲点，循环时位置一致
            const isLatest = total > 0 && idx % total === 0;
            return (
              <Link
                key={`${item.id}-${idx}`}
                href={`/flash/${item.id}`}
                className="block px-4 py-2 hover:bg-[#fafafa] transition-colors group"
                style={{ height: `${itemHeight}px`, borderBottom: '1px solid #efefef' }}
              >
                {/* 两行排版：第一行时间（主色金），第二行标题（黑色） */}
                <div className="flex items-center gap-1.5">
                  {isLatest && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse"
                      style={{ backgroundColor: '#ef4444' }}
                    />
                  )}
                  <time
                    className="text-xs font-bold"
                    style={{ color: 'var(--c-accent-dark)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                  >
                    {time}
                  </time>
                </div>
                <p
                  className="text-sm leading-snug line-clamp-1 mt-0.5 font-medium group-hover:text-[var(--c-accent-dark)] transition-colors"
                  style={{ color: '#000000' }}
                >
                  {item.title}
                </p>
              </Link>
            );
          })}
        </div>

        {/* 底部渐变遮罩 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #ffffff, transparent)' }}
        />
      </div>
    </div>
  );
}
