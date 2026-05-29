'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { siteConfig } from '@/lib/site.config';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
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

        {/* Search */}
        <form onSubmit={handleSearch} className="relative w-40 sm:w-56">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--c-text-3)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索文章..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border rounded-lg outline-none transition-colors"
            style={{ borderColor: 'var(--c-border)', backgroundColor: 'var(--c-surface)', color: 'var(--c-text)' }}
          />
        </form>
      </div>
    </header>
  );
}
