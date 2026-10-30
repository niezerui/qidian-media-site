import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ContactForm from '@/components/ContactForm';
import { siteConfig } from '@/lib/site.config';

export const revalidate = 60; // 页脚分类读库，ISR 定期刷新

export const metadata: Metadata = {
  title: '联系奇点',
  description: '联系我们 - 奇点编辑部',
  alternates: {
    canonical: 'https://www.qidianyanjiushe.com/contact',
    types: {
      // llms.txt 规范：本页的 Markdown 版本
      'text/markdown': '/contact.md',
      'text/plain': '/llms.txt',
    },
  },
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="site-container pt-6 pb-16">
          <div className="max-w-3xl mx-auto">
            {/* 页头 */}
            <div className="flex items-center gap-3 mb-3">
              <span className="w-[10px] h-[26px]" style={{ backgroundColor: 'var(--c-accent)' }} />
              <h1 className="text-3xl font-black" style={{ color: '#000' }}>联系奇点</h1>
              <span className="text-[11px] font-bold pt-1" style={{ color: '#999', letterSpacing: '0.22em', fontFamily: 'var(--font-mono)' }}>CONTACT</span>
            </div>
            <p className="mb-10" style={{ color: 'var(--c-text-2)' }}>
              我们欢迎读者来信、商业合作、投稿等各种形式的联系。
            </p>

            {/* 联系卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px mb-10" style={{ backgroundColor: 'var(--c-border)' }}>
              {[
                { icon: '✉', title: '投稿 / 爆料', desc: siteConfig.contact.editorEmail },
                { icon: '◆', title: '商务合作', desc: siteConfig.contact.bizEmail },
                { icon: '✦', title: '加入我们', desc: siteConfig.contact.hrEmail },
              ].map(c => (
                <div key={c.title} className="p-6" style={{ backgroundColor: '#fff' }}>
                  <span className="inline-flex items-center justify-center w-8 h-8 mb-4 text-sm font-bold"
                    style={{ backgroundColor: 'var(--c-accent)', color: '#000' }}>{c.icon}</span>
                  <h3 className="text-base font-black mb-2" style={{ color: '#000' }}>{c.title}</h3>
                  <p className="text-sm break-all" style={{ color: 'var(--c-text-2)' }}>{c.desc}</p>
                </div>
              ))}
            </div>

            {/* 表单 */}
            <ContactForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
