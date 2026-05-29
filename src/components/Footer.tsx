import Link from 'next/link';

const CATEGORIES = [
  { slug: '24h-news', name: '24小时快讯' },
  { slug: 'retail-ecommerce', name: '零售电商' },
  { slug: 'mobile-digital', name: '手机数码' },
  { slug: 'ai-llm', name: 'AI大模型' },
  { slug: 'embodied-ai', name: '具身智能' },
  { slug: 'ai-hardware', name: 'AI硬件' },
  { slug: 'ai-applications', name: 'AI应用' },
  { slug: 'ip-gaming', name: 'IP游戏' },
];

export default function Footer() {
  return (
    <footer className="bg-brand-950 text-brand-300 mt-auto">
      <div className="content-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-brand-900 font-bold text-sm">奇</span>
              </div>
              <span className="text-xl font-bold text-white">奇点</span>
            </Link>
            <p className="text-sm text-brand-400 leading-relaxed">
              聚焦AI、科技与商业的深度媒体平台。
              <br />
              记录智能时代的每一次突破。
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">内容分类</h3>
            <ul className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="text-sm text-brand-400 hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">关于我们</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-sm text-brand-400 hover:text-white transition-colors">
                  联系奇点
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-sm text-brand-400 hover:text-white transition-colors">
                  关于奇点
                </Link>
              </li>
              <li>
                <Link href="/join" className="text-sm text-brand-400 hover:text-white transition-colors">
                  加入我们
                </Link>
              </li>
              <li>
                <Link href="/advertise" className="text-sm text-brand-400 hover:text-white transition-colors">
                  广告合作
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">关注我们</h3>
            <p className="text-sm text-brand-400 leading-relaxed mb-4">
              获取最新科技商业资讯，
              <br />
              欢迎通过以下方式联系我们。
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white border border-brand-600 rounded-md hover:bg-brand-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              联系奇点
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-brand-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-brand-500">
            &copy; {new Date().getFullYear()} 奇点 Qidian. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-xs text-brand-500 hover:text-brand-300 transition-colors">
              隐私政策
            </Link>
            <Link href="/terms" className="text-xs text-brand-500 hover:text-brand-300 transition-colors">
              服务条款
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
