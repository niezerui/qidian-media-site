'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { siteConfig } from '@/lib/site.config';

const NAV = siteConfig.categories;

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: 'var(--c-border)' }}>
      <div className="site-container flex items-center justify-between h-14 sm:h-16">
        {/* Left: Logo + Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 no-underline">
            {siteConfig.logo.type === 'image' ? (
              <img src={siteConfig.logo.imageUrl} alt={siteConfig.name} className="h-9 sm:h-10 w-auto" />
            ) : (
              <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-white text-sm font-bold"
                style={{ backgroundColor: 'var(--c-primary)' }}>{siteConfig.logo.text}</span>
            )}
          </Link>

          {/* Desktop categories */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <Link href="/"
              className={`whitespace-nowrap px-2.5 py-1.5 rounded-md text-sm font-bold transition-colors ${pathname === '/' ? '' : 'hover:bg-gray-50'}`}
              style={{ color: pathname === '/' ? 'var(--c-text)' : 'var(--c-text-2)', backgroundColor: pathname === '/' ? 'var(--c-surface)' : 'transparent' }}>推荐</Link>
            {NAV.map(cat => {
              const active = pathname === `/category/${cat.slug}`;
              return (
                <Link key={cat.slug} href={`/category/${cat.slug}`}
                  className={`whitespace-nowrap px-2.5 py-1.5 rounded-md text-sm transition-colors ${active ? 'font-bold' : 'hover:bg-gray-50'}`}
                  style={{ color: active ? 'var(--c-text)' : 'var(--c-text-2)', backgroundColor: active ? 'var(--c-surface)' : 'transparent' }}>{cat.name}</Link>
              );
            })}
          </nav>
        </div>

        {/* Right: search + hamburger */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="relative hidden sm:block w-36 lg:w-48">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--c-text-3)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索文章..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg outline-none transition-colors"
              style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)', color: 'var(--c-text)' }} />
          </form>
          <Link href="/?search=" className="sm:hidden w-8 h-8 flex items-center justify-center" style={{ color: 'var(--c-text-2)' }} aria-label="搜索">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </Link>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden w-8 h-8 flex items-center justify-center" style={{ color: 'var(--c-text)' }}>
            {menuOpen ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>}
          </button>
        </div>
      </div>

      {/* Mobile dropdown nav */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-1" style={{ backgroundColor: 'var(--c-bg)', borderColor: 'var(--c-border)' }}>
          <Link href="/" onClick={() => setMenuOpen(false)}
            className={`block py-2.5 text-sm border-b font-bold ${pathname === '/' ? '' : ''}`}
            style={{ borderColor: 'var(--c-border)', color: 'var(--c-text)' }}>推荐</Link>
          {NAV.map(cat => {
            const active = pathname === `/category/${cat.slug}`;
            return (
              <Link key={cat.slug} href={`/category/${cat.slug}`} onClick={() => setMenuOpen(false)}
                className={`block py-2.5 text-sm border-b last:border-0 ${active ? 'font-bold' : ''}`}
                style={{ borderColor: 'var(--c-border)', color: active ? 'var(--c-text)' : 'var(--c-text)' }}>{cat.name}</Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
