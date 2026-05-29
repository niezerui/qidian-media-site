import Link from 'next/link';

const CATEGORIES = [
  { slug: 'retail-ecommerce', name: '零售电商' },
  { slug: 'mobile-digital', name: '手机数码' },
  { slug: 'ai-llm', name: 'AI大模型' },
  { slug: 'embodied-ai', name: '具身智能' },
  { slug: 'ai-hardware', name: 'AI硬件' },
  { slug: 'ai-applications', name: 'AI应用' },
  { slug: 'ip-gaming', name: 'IP游戏' },
];

export default function CategoryNav() {
  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
      <Link
        href="/"
        className="px-3 py-1.5 text-sm font-medium text-brand-900 bg-brand-50 rounded-md whitespace-nowrap hover:bg-brand-100 transition-colors"
      >
        推荐
      </Link>
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.slug}
          href={`/category/${cat.slug}`}
          className="px-3 py-1.5 text-sm text-brand-500 hover:text-brand-900 hover:bg-brand-50 rounded-md transition-colors whitespace-nowrap"
        >
          {cat.name}
        </Link>
      ))}
    </div>
  );
}
