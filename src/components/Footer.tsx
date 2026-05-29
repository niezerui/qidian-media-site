import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';

export default function Footer() {
  return (
    <footer className="bg-brand-950 text-brand-300 mt-auto">
      <div className="content-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-brand-900 font-bold text-sm">{siteConfig.logo.text}</span>
              </div>
              <span className="text-xl font-bold text-white">{siteConfig.name}</span>
            </Link>
            <p className="text-sm text-brand-400 leading-relaxed">
              {siteConfig.slogan}
              <br />
              {siteConfig.description}
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">内容分类</h3>
            <ul className="grid grid-cols-2 gap-2">
              {siteConfig.categories.map((cat) => (
                <li key={cat.slug}>
                  <Link href={`/category/${cat.slug}`} className="text-sm text-brand-400 hover:text-white transition-colors">{cat.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">关于我们</h3>
            <ul className="space-y-2">
              {siteConfig.footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-brand-400 hover:text-white transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">关注我们</h3>
            <p className="text-sm text-brand-400 leading-relaxed mb-3">
              {siteConfig.slogan}。
              <br />
              欢迎通过以下方式联系我们。
            </p>
            <Link href="/contact" className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white border border-brand-600 rounded-md hover:bg-brand-800 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              联系{siteConfig.name}
            </Link>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-brand-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-brand-500">&copy; {new Date().getFullYear()} {siteConfig.name} {siteConfig.tagline}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-xs text-brand-500 hover:text-brand-300 transition-colors">隐私政策</Link>
            <Link href="/terms" className="text-xs text-brand-500 hover:text-brand-300 transition-colors">服务条款</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
