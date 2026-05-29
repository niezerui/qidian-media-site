'use client';

import Link from 'next/link';

interface Article {
  id: number; title: string; slug: string; summary: string;
  cover_image: string | null; category_name?: string; author: string;
  is_exclusive: boolean; published_at: string; view_count: number;
}

function formatDate(d: string) { return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }); }

export default function ArticleCard({ article, variant = 'default' }: { article: Article; variant?: 'default' | 'featured' | 'compact' }) {
  const date = formatDate(article.published_at);

  // 精选大图
  if (variant === 'featured') {
    return (
      <Link href={`/article/${article.slug}`} className="group block rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--c-surface)' }}>
        {article.cover_image && (
          <div className="aspect-[21/9] overflow-hidden">
            <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        )}
        <div className={article.cover_image ? 'p-6' : 'p-8'}>
          <div className="flex items-center gap-2 mb-2">
            {article.category_name && <span className="text-xs px-2.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--c-border)', color: 'var(--c-text-2)' }}>{article.category_name}</span>}
            {article.is_exclusive && <span className="text-xs px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--c-accent)' }}>独家</span>}
          </div>
          <h2 className="text-2xl font-bold leading-snug mb-2 group-hover:opacity-70 transition-opacity" style={{ color: 'var(--c-text)' }}>{article.title}</h2>
          <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--c-text-2)' }}>{article.summary}</p>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--c-text-3)' }}>
            <span>{date}</span><span>{article.author}</span>
          </div>
        </div>
      </Link>
    );
  }

  // 横向紧凑
  if (variant === 'compact') {
    return (
      <Link href={`/article/${article.slug}`} className="group flex gap-4 py-4 border-b" style={{ borderColor: 'var(--c-border)' }}>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium line-clamp-2 leading-snug group-hover:opacity-70 transition-opacity" style={{ color: 'var(--c-text)' }}>{article.title}</h3>
          <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--c-text-3)' }}>
            {article.category_name && <span>{article.category_name}</span>}<span>{date}</span>
          </div>
        </div>
        {article.cover_image && (
          <div className="w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--c-surface)' }}>
            <img src={article.cover_image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </Link>
    );
  }

  // 默认卡片：封面 + 标题 + 摘要
  return (
    <Link href={`/article/${article.slug}`} className="group block bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow"
      style={{ borderColor: 'var(--c-border)' }}>
      {/* 封面 */}
      {article.cover_image && (
        <div className="aspect-[16/9] overflow-hidden" style={{ backgroundColor: 'var(--c-surface)' }}>
          <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}
      {/* 内容 */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {article.category_name && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-text-2)' }}>{article.category_name}</span>}
          {article.is_exclusive && <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: 'var(--c-accent)' }}>独家</span>}
        </div>
        <h3 className="text-base font-bold line-clamp-2 leading-snug mb-1.5 group-hover:opacity-70 transition-opacity" style={{ color: 'var(--c-text)' }}>
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--c-text-2)' }}>{article.summary}</p>
        )}
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--c-text-3)' }}>
          <span>{date}</span>
          <span>{article.author}</span>
          {article.view_count > 0 && <span>{article.view_count} 阅读</span>}
        </div>
      </div>
    </Link>
  );
}
