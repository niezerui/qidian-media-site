'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { siteConfig } from '@/lib/site.config';

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: 'var(--c-border)' }}>
      <div className="site-container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 no-underline">
          {siteConfig.logo.type === 'image' ? (
            <img src={siteConfig.logo.imageUrl} alt={siteConfig.name} className="h-8 w-auto" />
          ) : (
            <span className="flex items-center justify-center w-8 h-8 rounded-lg text-white text-sm font-bold"
              style={{ backgroundColor: 'var(--c-primary)' }}>{siteConfig.logo.text}</span>
          )}
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>
            {siteConfig.name}
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-1">
              <input
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索" autoFocus
                className="w-36 sm:w-48 px-3 py-1.5 text-sm border rounded-lg outline-none transition-all"
                style={{ borderColor: 'var(--c-border)' }}
              />
              <button type="button" onClick={() => setSearchOpen(false)}
                className="px-2 py-1 text-sm" style={{ color: 'var(--c-text-3)' }}>✕</button>
            </form>
          ) : (
            <button onClick={() => setSearchOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors" aria-label="搜索">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          )}

          <Link href="/admin/login" className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border transition-colors hover:opacity-70"
            style={{ borderColor: 'var(--c-accent)', color: 'var(--c-accent)' }}>
            管理
          </Link>
        </div>
      </div>
    </header>
  );
}
