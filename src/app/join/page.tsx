import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { siteConfig } from '@/lib/site.config';

export const revalidate = 60; // 页脚分类读库，ISR 定期刷新

export const metadata: Metadata = {
  title: `加入我们 | ${siteConfig.name}`,
  description: `加入${siteConfig.name}，一起用有趣、好玩的视角记录科技时代。`,
  alternates: {
    canonical: 'https://www.qidianyanjiushe.com/join',
    types: {
      // llms.txt 规范：本页的 Markdown 版本
      'text/markdown': '/join.md',
      'text/plain': '/llms.txt',
    },
  },
};

export default function JoinPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="site-container py-12 max-w-3xl">
          <nav className="flex items-center gap-1.5 text-sm mb-8" style={{ color: 'var(--c-text-3)' }}>
            <a href="/" className="hover:underline">首页</a><span>/</span>
            <span style={{ color: 'var(--c-text-2)' }}>加入我们</span>
          </nav>

          {/* 页头 */}
          <div className="flex items-center gap-3 mb-3">
            <span className="w-[10px] h-[26px]" style={{ backgroundColor: 'var(--c-accent)' }} />
            <h1 className="text-3xl font-black" style={{ color: '#000' }}>加入我们</h1>
            <span className="text-[11px] font-bold pt-1" style={{ color: '#999', letterSpacing: '0.22em', fontFamily: 'var(--font-mono)' }}>JOIN US</span>
          </div>
          <p className="text-lg mb-10" style={{ color: 'var(--c-text-2)' }}>{siteConfig.name} 正在寻找志同道合的伙伴。</p>

          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: 'var(--c-border)' }}>
              <span className="w-[7px] h-[18px]" style={{ backgroundColor: 'var(--c-accent)' }} />
              <h2 className="text-xl font-black" style={{ color: '#000' }}>我们正在寻找</h2>
              <span className="text-[10px] font-bold pt-px" style={{ color: '#999', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>OPENINGS</span>
            </div>
            <div className="space-y-6 text-sm" style={{ color: 'var(--c-text-2)' }}>
              <div>
                <h3 className="font-bold text-base mb-2" style={{ color: '#000' }}>📝 科技记者 / 撰稿人</h3>
                <p>对AI、科技商业有独到见解，能写出有深度、有趣味的文章。有作品链接优先。</p>
              </div>
              <div>
                <h3 className="font-bold text-base mb-2" style={{ color: '#000' }}>🎨 视觉设计师</h3>
                <p>能为我们文章和品牌设计高质量的配图、信息图和视觉形象。</p>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: 'var(--c-border)' }}>
              <span className="w-[7px] h-[18px]" style={{ backgroundColor: 'var(--c-accent)' }} />
              <h2 className="text-xl font-black" style={{ color: '#000' }}>联系我们</h2>
              <span className="text-[10px] font-bold pt-px" style={{ color: '#999', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>CONTACT</span>
            </div>
            <p className="text-sm" style={{ color: 'var(--c-text-2)' }}>
              请发送简历/作品集至{' '}
              <a href={`mailto:${siteConfig.contact.hrEmail}`} className="font-bold underline underline-offset-4" style={{ color: '#000', textDecorationColor: 'var(--c-accent)' }}>{siteConfig.contact.hrEmail}</a>
              ，邮件标题格式：「应聘职位 + 姓名」。
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
