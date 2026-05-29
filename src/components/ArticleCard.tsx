import Link from 'next/link';

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
  const formattedDate = new Date(article.published_at).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (variant === 'featured') {
    return (
      <Link href={`/article/${article.slug}`} className="group block">
        <article className="relative overflow-hidden rounded-xl bg-brand-50">
          {article.cover_image && (
            <div className="aspect-[21/9] overflow-hidden">
              <img
                src={article.cover_image}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
          )}
          <div className={`${article.cover_image ? 'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8' : 'p-8'}`}>
            <div className="flex items-center gap-2 mb-3">
              {article.category_name && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${article.cover_image ? 'bg-white/20 text-white' : 'bg-brand-200 text-brand-700'}`}>
                  {article.category_name}
                </span>
              )}
              {article.is_exclusive && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-white">独家</span>
              )}
            </div>
            <h2 className={`text-2xl font-bold mb-3 leading-snug group-hover:opacity-80 transition-opacity ${article.cover_image ? 'text-white' : 'text-brand-900'}`}>
              {article.title}
            </h2>
            <p className={`text-sm line-clamp-2 mb-4 ${article.cover_image ? 'text-white/70' : 'text-brand-500'}`}>
              {article.summary}
            </p>
            <div className={`flex items-center gap-4 text-xs ${article.cover_image ? 'text-white/60' : 'text-brand-400'}`}>
              <span>{formattedDate}</span>
              <span>{article.author}</span>
              <span>{article.view_count} 阅读</span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link href={`/article/${article.slug}`} className="group block">
        <article className="flex gap-4 py-4 border-b border-brand-100">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-medium text-brand-900 group-hover:text-accent transition-colors line-clamp-2 leading-snug">
              {article.title}
            </h3>
            <div className="flex items-center gap-3 mt-2 text-xs text-brand-400">
              {article.category_name && <span>{article.category_name}</span>}
              <span>{formattedDate}</span>
            </div>
          </div>
          {article.cover_image && (
            <div className="w-24 h-16 flex-shrink-0 rounded-lg overflow-hidden">
              <img
                src={article.cover_image}
                alt={article.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
        </article>
      </Link>
    );
  }

  // Default card
  return (
    <Link href={`/article/${article.slug}`} className="group block">
      <article className="bg-white rounded-xl border border-brand-100 overflow-hidden hover:shadow-lg hover:border-brand-200 transition-all duration-300">
        {article.cover_image && (
          <div className="aspect-[16/9] overflow-hidden bg-brand-50">
            <img
              src={article.cover_image}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
        )}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            {article.category_name && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-100 text-brand-600">
                {article.category_name}
              </span>
            )}
            {article.is_exclusive && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-accent text-white">独家</span>
            )}
          </div>
          <h3 className="text-lg font-bold text-brand-900 group-hover:text-accent transition-colors line-clamp-2 leading-snug mb-2">
            {article.title}
          </h3>
          <p className="text-sm text-brand-500 line-clamp-2 leading-relaxed mb-4">
            {article.summary}
          </p>
          <div className="flex items-center justify-between text-xs text-brand-400">
            <div className="flex items-center gap-3">
              <span>{formattedDate}</span>
              <span>{article.author}</span>
            </div>
            <span>{article.view_count} 阅读</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
