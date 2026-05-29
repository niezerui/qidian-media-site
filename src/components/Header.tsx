'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { siteConfig } from '@/lib/site.config';
const c = siteConfig.colors;

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
    <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: c.border }}>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group flex-shrink-0">
            {siteConfig.logo.type === 'image' ? (
              <img src={siteConfig.logo.imageUrl} alt={siteConfig.name} className="h-8 w-auto" />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors group-hover:opacity-80"
                style={{ backgroundColor: c.primary }}
              >
                <span className="text-white font-bold text-sm">{siteConfig.logo.text}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight tracking-tight" style={{ color: c.textPrimary }}>{siteConfig.name}</span>
              <span className="text-[10px] leading-tight" style={{ color: c.textMuted }}>{siteConfig.tagline}</span>
            </div>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索文章..." className="w-40 sm:w-48 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-1 transition-all" style={{ borderColor: c.border }} autoFocus />
                <button type="button" onClick={() => setSearchOpen(false)} className="p-1" style={{ color: c.textMuted }}>✕</button>
              </form>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="p-2 rounded-md hover:bg-gray-50 transition-colors" aria-label="搜索" style={{ color: c.textSecondary }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
            )}

            <Link href="/contact" className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm border rounded-md transition-colors hover:opacity-80"
              style={{ color: c.accent, borderColor: c.accent }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              联系{siteConfig.name}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
