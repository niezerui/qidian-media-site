'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { siteConfig } from '@/lib/site.config';

const NAV = siteConfig.categories;
const TOP_LINKS = siteConfig.topLinks;

// 服务端渲染时用 useEffect 替身，避免 useLayoutEffect 的 SSR 告警
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * 导航文字上翻滚动画：
 * 双层文字竖排叠放，悬停时整体上移半格（正好一行），金色文案顶上来
 */
function RollLabel({ text, active }: { text: string; active: boolean }) {
  return (
    <span className="block overflow-hidden h-[1.5em]">
      <span className="flex flex-col will-change-transform transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
        <span
          className={`flex items-center h-[1.5em] text-[16px] lg:text-[17px] tracking-[0.03em] whitespace-nowrap ${active ? 'font-semibold text-black' : 'font-medium text-black'}`}
        >
          {text}
        </span>
        <span
          className="flex items-center h-[1.5em] text-[16px] lg:text-[17px] tracking-[0.03em] whitespace-nowrap font-semibold"
          style={{ color: 'var(--c-accent-dark)' }}
        >
          {text}
        </span>
      </span>
    </span>
  );
}

/**
 * Header 结构：
 *   Row 1 — Logo | 二维码入口（公众号/视频号/联系我们，悬停滑出）| 日期 · 搜索
 *   Row 2 — 分类条：宽度实测，放得下的平铺展示，放不下的自动收进右侧「更多 ▾」下拉；
 *           顺序由后台「分类管理」的排序决定，改完确认即在前后端同步
 *   ≤md  — 汉堡下拉菜单（列出全部分类）
 */
export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [today, setToday] = useState('');
  // 导航分类：默认静态兜底，挂载后拉取数据库分类（后台新增/重命名/排序自动同步到前台）
  const [navCats, setNavCats] = useState(NAV);
  // 分类条可平铺显示的条目数（其余收进「更多」）；999 = 全部可见（SSR 首屏）
  const [visibleCount, setVisibleCount] = useState(999);
  const [moreOpen, setMoreOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const loadCats = useCallback(() => {
    fetch('/api/categories', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.success && Array.isArray(d.data) && d.data.length > 0) {
          setNavCats(d.data.map((c: { slug: string; name: string }) => ({ slug: c.slug, name: c.name })));
        }
      })
      .catch(() => { /* 拉取失败时沿用静态配置 */ });
  }, []);

  // 挂载即拉取；后台改动（同源其他标签页）通过 BroadcastChannel 实时推送，回到页面时兜底刷新
  useEffect(() => {
    loadCats();
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('qidian-nav');
      bc.onmessage = () => loadCats();
    } catch { /* 浏览器不支持时忽略 */ }
    const onFocus = () => loadCats();
    const onVisible = () => { if (document.visibilityState === 'visible') loadCats(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      bc?.close();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadCats]);

  const ITEMS = [
    { slug: '', name: '推荐', href: '/' },
    ...navCats.map(c => ({ slug: c.slug, name: c.name, href: `/category/${c.slug}` })),
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  // 日期（客户端生成，避免 SSR/CSR 水合不一致）
  useEffect(() => {
    const d = new Date();
    const ymd = d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
    const wd = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
    setToday(`${ymd} ${wd}`);
  }, []);

  // 分类条宽度实测：放得下的平铺展示，放不下的收进右侧「更多」
  const itemsKey = ITEMS.map(i => i.name).join('|');
  useIsomorphicLayoutEffect(() => {
    const compute = () => {
      const bar = barRef.current;
      const meas = measureRef.current;
      if (!bar || !meas) return;
      const avail = bar.clientWidth;
      if (!avail) return;
      const widths = Array.from(meas.children).map(n => (n as HTMLElement).offsetWidth);
      const MORE_W = 96; // 给「更多 ▾」按钮预留的宽度
      const total = widths.reduce((a, b) => a + b, 0);
      if (total <= avail) { setVisibleCount(widths.length); return; }

      const budget = avail - MORE_W;
      let acc = 0;
      let fit = 0;
      for (let i = 0; i < widths.length; i++) {
        if (acc + widths[i] <= budget) { acc += widths[i]; fit += 1; } else break;
      }
      setVisibleCount(Math.max(1, fit));
    };

    compute();
    const ro = new ResizeObserver(compute);
    if (barRef.current) ro.observe(barRef.current);
    // 字体加载完成后文字宽度会变，需要重算
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      (document as any).fonts.ready.then(compute).catch(() => {});
    }
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  // 「更多」下拉：路由变化 / 点击面板外 / Esc 时关闭
  useEffect(() => { setMoreOpen(false); }, [pathname]);
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  const visibleItems = ITEMS.slice(0, Math.min(visibleCount, ITEMS.length));
  const overflowItems = ITEMS.slice(visibleItems.length);
  const hasOverflow = overflowItems.length > 0;
  const moreActive = overflowItems.some(i => i.href === pathname);

  return (
    <header
      className="sticky top-0 z-50 bg-[#000000]"
      style={{ borderTop: '3px solid var(--c-accent)' }}
    >
      {/* ============ Row 1：Logo | 二维码入口 | 日期 · 搜索 ============ */}
      <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        <div className="site-container flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0 no-underline">
            {siteConfig.logo.type === 'image' ? (
              <img src="/logo-white.png" alt={siteConfig.name} className="h-11 w-auto" />
            ) : (
              <span
                className="flex items-center justify-center w-9 h-9 text-white text-lg font-black"
                style={{ backgroundColor: 'var(--c-primary)' }}
              >
                {siteConfig.logo.text}
              </span>
            )}
          </Link>

          {/* 中部：三个二维码入口（悬停滑出）
              可点击性区分：
              · 有链接（联系我们）→ 箭头图标 + 悬停金色下划线展开，明显可点击
              · 纯悬停（公众号/视频号）→ 二维码小图标 + 光标保持默认，提示"悬停扫码" */}
          <nav className="hidden lg:flex items-center gap-1 flex-shrink-0">
            {TOP_LINKS.map(item => {
              const clickable = !!item.href;
              const inner = (
                <>
                  <span className="relative z-10 flex items-center gap-1.5">
                    <span
                      className="text-[14px] font-medium tracking-[0.02em] text-white"
                    >
                      {item.label}
                    </span>
                    {clickable ? (
                      /* 箭头：可点击信号，悬停右移 */
                      <svg
                        className="w-3 h-3 text-white group-hover:text-[var(--c-accent)] transition-all duration-200 group-hover:translate-x-0.5"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        <path className="opacity-0 group-hover:opacity-100 transition-opacity duration-200" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7-7 7" />
                      </svg>
                    ) : (
                      /* 二维码小图标：悬停扫码信号 */
                      <svg
                        className="w-3.5 h-3.5 opacity-50 transition-all duration-200 group-hover:opacity-100"
                        style={{ color: 'var(--c-accent)' }}
                        fill="currentColor" viewBox="0 0 24 24"
                      >
                        <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm6-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10-2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z" />
                      </svg>
                    )}
                  </span>
                  {/* 可点击项：悬停金线从中心展开 */}
                  {clickable && (
                    <span
                      className="absolute inset-x-4 bottom-1.5 h-[2px] origin-center scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
                      style={{ backgroundColor: 'var(--c-accent)' }}
                    />
                  )}
                  {/* 二维码面板：从标签下方滑出 */}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 pt-2.5 block opacity-0 invisible translate-y-1.5 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 ease-out z-50">
                    <span className="block bg-white border p-3 w-[172px] shadow-[0_12px_32px_rgba(0,0,0,0.12)]" style={{ borderColor: 'var(--c-border)' }}>
                      <span className="block w-[148px] h-[148px] overflow-hidden" style={{ backgroundColor: 'var(--c-surface)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.qr} alt={item.caption} className="w-full h-full object-cover block" />
                      </span>
                      <span className="block text-center text-xs font-bold mt-2.5" style={{ color: '#000' }}>{item.caption}</span>
                      <span className="block mx-auto mt-2 h-[2px] w-8" style={{ backgroundColor: 'var(--c-accent)' }} />
                    </span>
                  </span>
                </>
              );
              const cls = clickable
                ? 'relative group flex items-center px-4 py-2.5 select-none cursor-pointer'
                : 'relative group flex items-center px-4 py-2.5 select-none cursor-default';
              return item.href ? (
                <Link key={item.label} href={item.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <span key={item.label} className={cls} title="悬停查看二维码">
                  {inner}
                </span>
              );
            })}
          </nav>

          {/* 右侧：日期 + 搜索 */}
          <div className="flex items-center gap-5 lg:gap-7">
            {today && (
              <span
                className="hidden xl:block text-xs pt-px whitespace-nowrap"
                style={{ color: '#ffffff', fontFamily: 'var(--font-mono)', letterSpacing: '0.14em' }}
              >
                {today}
              </span>
            )}
            <form onSubmit={handleSearch} className="relative hidden sm:flex items-center w-40 lg:w-56 group">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索…"
                className="w-full pl-1 pr-9 py-2 text-sm lg:text-[15px] border-b-2 bg-transparent outline-none transition-colors focus:border-[var(--c-accent)] placeholder:text-[rgba(255,255,255,0.35)]"
                style={{ borderColor: 'rgba(255,255,255,0.3)', color: '#ffffff' }}
              />
              <button
                type="submit"
                aria-label="搜索"
                className="absolute right-0 top-0 h-full px-2 flex items-center justify-center transition-colors hover:text-[var(--c-accent)]"
                style={{ color: '#ffffff' }}
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
            <Link href="/search" className="sm:hidden w-9 h-9 flex items-center justify-center" style={{ color: '#ffffff' }} aria-label="搜索">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </Link>

            {/* Mobile hamburger */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-8 h-8 flex items-center justify-center" style={{ color: '#ffffff' }} aria-label="菜单">
              {menuOpen ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
            </button>
          </div>
        </div>
      </div>

      {/* ============ Row 2：分类条（宽度自适应，溢出收进「更多」） ============ */}
      <div className="hidden md:block border-b bg-white" style={{ borderColor: 'var(--c-border)' }}>
        <div className="site-container">
          <div ref={barRef} className="relative flex items-stretch h-12">
            {/* 可见分类 */}
            <nav className={`flex items-stretch ${hasOverflow ? '' : 'mx-auto'}`}>
              {visibleItems.map(item => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.slug || 'home'}
                    href={item.href}
                    data-active={active || undefined}
                    className="group relative flex items-center px-5 lg:px-6 h-12 whitespace-nowrap"
                  >
                    {/* 上翻滚文字动画 + 底部指示条从中心展开 */}
                    <RollLabel text={item.name} active={active} />
                    <span
                      className={`absolute inset-x-4 lg:inset-x-5 bottom-0 h-[2.5px] origin-center transition-transform duration-200 ease-out ${active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
                      style={{ backgroundColor: 'var(--c-accent)' }}
                    />
                  </Link>
                );
              })}
            </nav>

            {/* 溢出项：更多 ▾ */}
            {hasOverflow && (
              <div
                ref={moreRef}
                className="relative ml-auto flex items-stretch"
                onMouseEnter={() => setMoreOpen(true)}
                onMouseLeave={() => setMoreOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setMoreOpen(v => !v)}
                  aria-haspopup="true"
                  aria-expanded={moreOpen}
                  aria-label="更多分类"
                  className="group relative flex items-center px-5 lg:px-6 h-12 whitespace-nowrap cursor-pointer"
                >
                  <span
                    className="flex items-center gap-1.5 text-[16px] lg:text-[17px] tracking-[0.03em] font-medium transition-colors"
                    style={{ color: (moreActive || moreOpen) ? 'var(--c-accent-dark)' : '#000000' }}
                  >
                    更多
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                  <span
                    className={`absolute inset-x-4 lg:inset-x-5 bottom-0 h-[2.5px] origin-center transition-transform duration-200 ease-out ${(moreActive || moreOpen) ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}
                    style={{ backgroundColor: 'var(--c-accent)' }}
                  />
                </button>

                {/* 下拉面板 */}
                <div
                  className={`absolute right-0 top-full z-50 w-[228px] transition-all duration-200 ease-out ${moreOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1.5 pointer-events-none'}`}
                  style={{ borderTop: '2px solid var(--c-accent)' }}
                >
                  <div className="bg-white border border-t-0 shadow-[0_14px_36px_rgba(0,0,0,0.14)]" style={{ borderColor: 'var(--c-border)' }}>
                    {overflowItems.map(item => {
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.slug || 'home'}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className="group/item relative flex items-center px-5 py-3 text-[15px] transition-colors hover:bg-[#fafafa]"
                          style={{ borderBottom: '1px solid #f2f2f2' }}
                        >
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-[18px] origin-left transition-transform duration-200"
                            style={{ backgroundColor: 'var(--c-accent)', transform: active ? 'scaleY(1)' : 'scaleY(0)' }}
                          />
                          <span
                            className="font-medium transition-colors group-hover/item:text-[var(--c-accent-dark)]"
                            style={{ color: active ? 'var(--c-accent-dark)' : '#000000' }}
                          >
                            {item.name}
                          </span>
                          <svg
                            className="w-3.5 h-3.5 ml-auto opacity-0 -translate-x-1 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all duration-200"
                            style={{ color: 'var(--c-accent-dark)' }}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* 隐藏测量层：与实际导航同样的字号/内边距，仅用于量宽度 */}
            <div
              ref={measureRef}
              aria-hidden="true"
              className="absolute left-0 top-0 flex invisible pointer-events-none"
              style={{ height: 0, overflow: 'hidden' }}
            >
              {ITEMS.map(item => (
                <span
                  key={item.slug || 'home'}
                  className="flex items-center px-5 lg:px-6 h-12 whitespace-nowrap text-[16px] lg:text-[17px] tracking-[0.03em] font-medium"
                >
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ 移动端下拉菜单 ============ */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-1 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: 'var(--c-bg)', borderColor: 'var(--c-border)' }}>
          <Link href="/" onClick={() => setMenuOpen(false)}
            className="block py-3 text-base border-b font-black"
            style={{ borderColor: 'var(--c-border)', color: pathname === '/' ? 'var(--c-accent)' : 'var(--c-text)' }}>推荐</Link>
          {navCats.map(cat => {
            const active = pathname === `/category/${cat.slug}`;
            return (
              <Link key={cat.slug} href={`/category/${cat.slug}`} onClick={() => setMenuOpen(false)}
                className="block py-3 text-base border-b last:border-0 font-medium"
                style={{ borderColor: 'var(--c-border)', color: active ? 'var(--c-accent)' : 'var(--c-text)' }}>{cat.name}</Link>
            );
          })}
          <Link href="/contact" onClick={() => setMenuOpen(false)}
            className="block py-3 text-base font-medium"
            style={{ color: 'var(--c-text)' }}>联系我们</Link>
        </div>
      )}
    </header>
  );
}
