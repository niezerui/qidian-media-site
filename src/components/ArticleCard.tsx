'use client';

import Link from 'next/link';
import { getImageUrl } from '@/lib/image';
import { formatViews } from '@/lib/viewBoost';

interface Article {
  id: number; title: string; slug: string; summary: string;
  cover_image: string | null; category_name?: string; author: string;
  is_exclusive: boolean; published_at: string; view_count: number;
  tags?: string[];
}

function formatDate(d: string) { return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }); }

export default function ArticleCard({ article, variant = 'default' }: { article: Article; variant?: 'default' | 'featured' | 'compact' | 'list' }) {
  const date = formatDate(article.published_at);

  // 精选大图（无描边，直角）
  if (variant === 'featured') {
    return (
      <Link href={`/article/${article.slug}`} className="group block overflow-hidden" style={{ backgroundColor: 'var(--c-surface)' }}>
        {article.cover_image && (
          <div className="aspect-[21/9] overflow-hidden">
            <img src={getImageUrl(article.cover_image)} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        )}
        <div className={article.cover_image ? 'p-6' : 'p-8'}>
          <div className="flex items-center gap-2 mb-2">
            {article.category_name && <span className="text-xs px-2.5 py-0.5" style={{ backgroundColor: 'var(--c-border)', color: 'var(--c-text-2)' }}>{article.category_name}</span>}
            {!!article.is_exclusive && <span className="text-xs px-2.5 py-0.5 text-white" style={{ backgroundColor: 'var(--c-accent)' }}>独家</span>}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold leading-[1.5] mb-2 group-hover:opacity-70 transition-opacity" style={{ color: '#000000' }}>{article.title}</h2>
          <p className="text-base line-clamp-2 mb-3" style={{ color: 'var(--c-text-2)' }}>{article.summary}</p>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--c-text-3)' }}>
            <span>{date}</span>
          </div>
        </div>
      </Link>
    );
  }

  // 横向紧凑（无描边，直角，带底部分割线）
  if (variant === 'compact') {
    return (
      <Link href={`/article/${article.slug}`} className="group flex gap-4 py-4 border-b last:border-b-0" style={{ borderColor: 'var(--c-border)' }}>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-medium line-clamp-2 leading-[1.5] group-hover:opacity-70 transition-opacity" style={{ color: '#000000' }}>{article.title}</h3>
          <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--c-text-3)' }}>
            {article.category_name && <span>{article.category_name}</span>}<span>{date}</span>
          </div>
        </div>
        {article.cover_image && (
          <div className="w-20 h-14 flex-shrink-0 overflow-hidden" style={{ backgroundColor: 'var(--c-surface)' }}>
            <img src={getImageUrl(article.cover_image)} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </Link>
    );
  }

  // 列表竖排：封面左 + 内容右（无描边，直角，编辑部风格）
  if (variant === 'list') {
    return (
      <Link href={`/article/${article.slug}`} className="group flex gap-4 py-5 border-b last:border-b-0 items-stretch"
        style={{ borderColor: 'var(--c-border)' }}>
        {article.cover_image && (
          <div className="w-36 sm:w-44 h-24 sm:h-28 flex-shrink-0 overflow-hidden self-center" style={{ backgroundColor: 'var(--c-surface)' }}>
            <img src={getImageUrl(article.cover_image)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col py-0.5">
          <div className="flex items-center gap-2 mb-2">
            {article.category_name && <span className="text-xs px-2 py-0.5 font-bold" style={{ backgroundColor: 'var(--c-accent)', color: '#000' }}>{article.category_name}</span>}
            {!!article.is_exclusive && <span className="text-xs px-2 py-0.5 font-bold text-white" style={{ backgroundColor: 'var(--c-text)' }}>独家</span>}
          </div>
          <h3 className="text-lg font-black line-clamp-2 leading-[1.5] mb-1.5 group-hover:opacity-80 transition-opacity" style={{ color: '#000000' }}>{article.title}</h3>
          {article.summary && <p className="hidden sm:block text-sm leading-relaxed line-clamp-2 mb-2" style={{ color: 'var(--c-text-2)' }}>{article.summary}</p>}
          <div className="flex items-center justify-between mt-auto text-xs" style={{ color: 'var(--c-text-3)' }}>
            <span className="flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
              {new Date(article.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
            </span>
            <span className="flex items-center gap-1.5">
              {article.view_count > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {formatViews(article.view_count)}
                </span>
              )}
              <span className="font-bold transition-colors group-hover:text-[var(--c-accent)]" style={{ color: '#bbb' }}>→</span>
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // 默认卡片：封面 + 标题 + 摘要（无描边，直角，编辑部风格）
  return (
    <Link href={`/article/${article.slug}`} className="group flex flex-col overflow-hidden" style={{ backgroundColor: '#fff' }}>
      {/* 封面 */}
      {article.cover_image && (
        <div className="aspect-[16/10] overflow-hidden relative" style={{ backgroundColor: 'var(--c-surface)' }}>
          <img src={getImageUrl(article.cover_image)} alt={article.title} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700" />
          {/* 分类标签：左下角矩形（直角） */}
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {article.category_name && <span className="text-xs px-2.5 py-1 font-bold text-white" style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}>{article.category_name}</span>}
            {!!article.is_exclusive && <span className="text-xs px-2.5 py-1 font-bold text-white" style={{ backgroundColor: 'var(--c-accent)' }}>独家</span>}
          </div>
        </div>
      )}
      {/* 内容 */}
      <div className={`flex flex-col flex-1 ${article.cover_image ? 'pt-4' : 'pt-3'}`}>
        {!article.cover_image && (
          <div className="flex items-center gap-2 mb-2.5">
            {article.category_name && <span className="text-xs px-2 py-0.5 font-bold" style={{ backgroundColor: 'var(--c-surface)', color: 'var(--c-text)' }}>{article.category_name}</span>}
            {!!article.is_exclusive && <span className="text-xs px-2 py-0.5 font-bold text-white" style={{ backgroundColor: 'var(--c-accent)' }}>独家</span>}
          </div>
        )}
        <h3 className="text-[17px] font-black line-clamp-2 leading-[1.5] mb-2 group-hover:opacity-80 transition-opacity" style={{ color: '#000000' }}>
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-sm leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--c-text-2)' }}>{article.summary}</p>
        )}
        {/* meta 底部自动对齐 */}
        <div className="flex items-center justify-between text-xs mt-auto pt-1 border-t" style={{ color: 'var(--c-text-3)', borderColor: 'var(--c-border)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
            {new Date(article.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
          </span>
          <span className="flex items-center gap-1">
            {article.view_count > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {formatViews(article.view_count)}
              </span>
            )}
            <span className="group-hover:text-[var(--c-accent)] transition-colors font-bold" style={{ color: '#999' }}>
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
