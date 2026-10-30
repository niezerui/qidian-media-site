import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { siteConfig } from '@/lib/site.config';

export const revalidate = 60; // 页脚分类读库，ISR 定期刷新

export const metadata: Metadata = {
  title: `广告合作 | ${siteConfig.name}`,
  description: `与${siteConfig.name}合作，触达对科技和AI最敏感的高质量读者。`,
  alternates: {
    canonical: 'https://www.qidianyanjiushe.com/advertise',
    types: {
      // llms.txt 规范：本页的 Markdown 版本
      'text/markdown': '/advertise.md',
      'text/plain': '/llms.txt',
    },
  },
};

export default function AdvertisePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="site-container pt-6 pb-16 max-w-3xl">
          <nav className="flex items-center gap-1.5 text-sm mb-6" style={{ color: 'var(--c-text-3)' }}>
            <a href="/" className="hover:underline">首页</a><span>/</span>
            <span style={{ color: 'var(--c-text-2)' }}>广告合作</span>
          </nav>

          {/* 页头 */}
          <div className="flex items-center gap-3 mb-3">
            <span className="w-[10px] h-[26px]" style={{ backgroundColor: 'var(--c-accent)' }} />
            <h1 className="text-3xl font-black" style={{ color: '#000' }}>广告合作</h1>
            <span className="text-[11px] font-bold pt-1" style={{ color: '#999', letterSpacing: '0.22em', fontFamily: 'var(--font-mono)' }}>ADVERTISE</span>
          </div>
          <p className="text-lg mb-10" style={{ color: 'var(--c-text-2)' }}>与{siteConfig.name}合作，触达对科技和AI最敏感的高质量读者。</p>

          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: 'var(--c-border)' }}>
              <span className="w-[7px] h-[18px]" style={{ backgroundColor: 'var(--c-accent)' }} />
              <h2 className="text-xl font-black" style={{ color: '#000' }}>为什么选择我们</h2>
              <span className="text-[10px] font-bold pt-px" style={{ color: '#999', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>WHY US</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ backgroundColor: 'var(--c-border)' }}>
              {[
                { icon: '🎯', title: '精准受众', desc: '我们的读者是对AI、科技商业高度关注的高质量人群' },
                { icon: '✍️', title: '内容原生', desc: '我们擅长将品牌信息融入高质量内容，而非生硬植入' },
                { icon: '📈', title: '数据透明', desc: '提供详细的投放报告，包括曝光、点击和转化数据' },
              ].map(i => (
                <div key={i.title} className="p-5 text-sm" style={{ backgroundColor: '#fff' }}>
                  <div className="text-2xl mb-3">{i.icon}</div>
                  <div className="font-black mb-1.5" style={{ color: '#000' }}>{i.title}</div>
                  <div style={{ color: 'var(--c-text-3)' }}>{i.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: 'var(--c-border)' }}>
              <span className="w-[7px] h-[18px]" style={{ backgroundColor: 'var(--c-accent)' }} />
              <h2 className="text-xl font-black" style={{ color: '#000' }}>联系商务</h2>
              <span className="text-[10px] font-bold pt-px" style={{ color: '#999', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>BUSINESS</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--c-text-2)' }}>
              请发送合作需求至{' '}
              <a href={`mailto:${siteConfig.contact.bizEmail}`} className="font-bold underline underline-offset-4" style={{ color: '#000', textDecorationColor: 'var(--c-accent)' }}>{siteConfig.contact.bizEmail}</a>
              ，我们将在24小时内回复。
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
