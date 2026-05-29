'use client';

import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';
const c = siteConfig.colors;

interface ArticleCardProps {
  article: {
    id: number;
    title: string;
    slug: string;
    summary: string;
    cover_image: string | null;
    category_name?: string;
    category_slug?: string;
    author: string;
    is_exclusive: boolean;
    published_at: string;
    view_count: number;
  };
  variant?: 'default' | 'featured' | 'compact';
}

export default function ArticleCard({ article, variant = 'default' }: ArticleCardProps) {
  const formattedDate = new Date(article.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  if (variant === 'featured') {
    return (
      <Link href={`/article/${article.slug}`} className="group block">
        <article className="relative overflow-hidden rounded-xl" style={{ backgroundColor: c.surface }}>
          {article.cover_image && (
            <div className="aspect-[21/9] overflow-hidden">
              <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          )}
          <div className={article.cover_image ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8' : 'p-8'}>
            <div className="flex items-center gap-2 mb-3">
              {article.category_name && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={article.cover_image ? { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' } : { backgroundColor: c.border, color: c.textSecondary }}>{article.category_name}</span>
              )}
              {article.is_exclusive && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: c.accent }}>独家</span>
              )}
            </div>
            <h2 className={`text-2xl font-bold mb-3 leading-snug group-hover:opacity-80 transition-opacity ${article.cover_image ? 'text-white' : ''}`} style={article.cover_image ? {} : { color: c.textPrimary }}>{article.title}</h2>
            <p className={`text-sm line-clamp-2 mb-4 ${article.cover_image ? 'text-white/70' : ''}`} style={article.cover_image ? {} : { color: c.textSecondary }}>{article.summary}</p>
            <div className="flex items-center gap-4 text-xs" style={article.cover_image ? { color: 'rgba(255,255,255,0.6)' } : { color: c.textMuted }}>
              <span>{formattedDate}</span><span>{article.author}</span><span>{article.view_count} 阅读</span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link href={`/article/${article.slug}`} className="group block">
        <article className="flex gap-4 py-4 border-b" style={{ borderColor: c.border }}>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium line-clamp-2 leading-snug group-hover:opacity-70 transition-opacity"
              style={{ color: c.textPrimary }}>{article.title}</h3>
            <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: c.textMuted }}>
              {article.category_name && <span>{article.category_name}</span>}<span>{formattedDate}</span>
            </div>
          </div>
          {article.cover_image && (
            <div className="w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden">
              <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
          )}
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/article/${article.slug}`} className="group block">
      <article className="bg-white rounded-xl border overflow-hidden hover:shadow-lg transition-all duration-300" style={{ borderColor: c.border }}>
        {article.cover_image && (
          <div className="aspect-[16/9] overflow-hidden" style={{ backgroundColor: c.surface }}>
            <img src={article.cover_image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            {article.category_name && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: c.surface, color: c.textSecondary }}>{article.category_name}</span>
            )}
            {article.is_exclusive && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: c.accent }}>独家</span>
            )}
          </div>
          <h3 className="text-lg font-bold line-clamp-2 leading-snug mb-2 group-hover:opacity-70 transition-opacity"
            style={{ color: c.textPrimary }}>{article.title}</h3>
          <p className="text-sm line-clamp-2 leading-relaxed mb-4" style={{ color: c.textSecondary }}>{article.summary}</p>
          <div className="flex items-center justify-between text-xs" style={{ color: c.textMuted }}>
            <div className="flex items-center gap-3"><span>{formattedDate}</span><span>{article.author}</span></div>
            <span>{article.view_count} 阅读</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
