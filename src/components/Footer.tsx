import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';

export default function Footer() {
  return (
    <footer className="mt-auto" style={{ backgroundColor: 'var(--c-footer)', color: '#aaa' }}>
      <div className="site-container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{siteConfig.name}</h3>
            <p className="text-sm leading-relaxed opacity-70">{siteConfig.slogan}</p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">内容</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {siteConfig.categories.filter(c => c.slug !== '24h-news').map(cat => (
                <Link key={cat.slug} href={`/category/${cat.slug}`} className="text-sm opacity-70 hover:opacity-100 hover:text-white transition-colors">
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

        <div className="mt-10 pt-6 border-t flex items-center justify-between text-xs opacity-50"
          style={{ borderColor: '#333' }}>
          <span>&copy; {new Date().getFullYear()} {siteConfig.name} {siteConfig.tagline}</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">隐私政策</Link>
            <Link href="/terms" className="hover:text-white">服务条款</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
