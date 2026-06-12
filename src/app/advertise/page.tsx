import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { siteConfig } from '@/lib/site.config';

export const metadata: Metadata = {
  title: `广告合作 | ${siteConfig.name}`,
  description: `与${siteConfig.name}合作，触达对科技和AI最敏感的高质量读者。`,
};

export default function AdvertisePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="site-container py-12 max-w-3xl">
          <nav className="flex items-center gap-1.5 text-sm mb-8" style={{ color: 'var(--c-text-3)' }}>
            <a href="/" className="hover:underline">首页</a><span>/</span>
            <span style={{ color: 'var(--c-text-2)' }}>广告合作</span>
          </nav>

          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--c-text)' }}>广告合作</h1>
          <p className="text-lg mb-10" style={{ color: 'var(--c-text-2)' }}>与{siteConfig.name}合作，触达对科技和AI最敏感的高质量读者。</p>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b" style={{ color: 'var(--c-text)', borderColor: 'var(--c-border)' }}>为什么选择我们</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              {[
                { icon: '🎯', title: '精准受众', desc: '我们的读者是对AI、科技商业高度关注的高质量人群' },
                { icon: '✍️', title: '内容原生', desc: '我们擅长将品牌信息融入高质量内容，而非生硬植入' },
                { icon: '📈', title: '数据透明', desc: '提供详细的投放报告，包括曝光、点击和转化数据' },
              ].map(i => (
                <div key={i.title} className="p-4 rounded-lg border" style={{ borderColor: 'var(--c-border)' }}>
                  <div className="text-2xl mb-2">{i.icon}</div>
                  <div className="font-bold mb-1" style={{ color: 'var(--c-text)' }}>{i.title}</div>
                  <div style={{ color: 'var(--c-text-3)' }}>{i.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 pb-2 border-b" style={{ color: 'var(--c-text)', borderColor: 'var(--c-border)' }}>联系商务</h2>
            <p className="text-sm" style={{ color: 'var(--c-text-2)' }}>
              请发送合作需求至{' '}
              <a href={`mailto:${siteConfig.contact.bizEmail}`} className="hover:underline" style={{ color: 'var(--c-accent)' }}>{siteConfig.contact.bizEmail}</a>
              ，我们将在24小时内回复。
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
