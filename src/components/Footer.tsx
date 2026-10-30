import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';
import { query } from '@/lib/db';

// 页脚分类：读数据库（与后台分类管理同步），失败时回退静态配置
async function getCategories(): Promise<{ slug: string; name: string }[]> {
  try {
    const rows = await query('SELECT slug, name FROM categories ORDER BY (sort_order IS NULL), sort_order, id');
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((r: any) => ({ slug: r.slug, name: r.name }));
    }
  } catch { /* 回退静态配置 */ }
  return siteConfig.categories;
}

export default async function Footer() {
  const categories = await getCategories();
  return (
    <footer style={{ backgroundColor: 'var(--c-footer)', color: '#aaa' }}>
      {/* 顶部金色标识线 */}
      <div className="h-[3px]" style={{ backgroundColor: 'var(--c-accent)' }} />
      <div className="site-container py-12">
        {/* 品牌标语带 */}
        <div className="flex items-center gap-3 pb-8 mb-8 border-b" style={{ borderColor: '#2a2a2a' }}>
          <span className="text-[11px] font-bold text-gold-grad" style={{ letterSpacing: '0.3em', fontFamily: 'var(--font-mono)' }}>QIDIAN · 奇点</span>
          <div className="flex-1 h-px" style={{ backgroundColor: '#2a2a2a' }} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{siteConfig.name}</h3>
            <p className="text-sm leading-relaxed opacity-70">{siteConfig.slogan}</p>
            <p className="text-xs opacity-50 mt-3" style={{ fontFamily: 'var(--font-mono)' }}>EST. 2024 · {siteConfig.tagline}</p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">内容</h3>
            <div className="grid grid-cols-2 gap-1.5">
            {categories.filter(c => c.slug !== '24h-news').map(cat => (
              <Link key={cat.slug} href={`/category/${cat.slug}`} className="text-sm opacity-70 hover:opacity-100 hover:text-[var(--c-accent)] transition-colors">
                {cat.name}
              </Link>
            ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">更多</h3>
            <div className="flex flex-col gap-1.5">
              {siteConfig.footerLinks.map(link => (
                <Link key={link.href} href={link.href} className="text-sm opacity-70 hover:opacity-100 hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">联系</h3>
            <p className="text-xs opacity-60 mb-1">{siteConfig.contact.editorEmail}</p>
            <p className="text-xs opacity-60">{siteConfig.contact.bizEmail}</p>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-2 text-xs opacity-50"
          style={{ borderColor: '#333' }}>
          <span>&copy; {new Date().getFullYear()} {siteConfig.name} {siteConfig.tagline} · 用有趣、好玩的视角记录时代奇点</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">隐私政策</Link>
            <Link href="/terms" className="hover:text-white">服务条款</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
