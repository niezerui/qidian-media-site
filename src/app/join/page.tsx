import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { siteConfig } from '@/lib/site.config';

export const metadata: Metadata = {
  title: `加入我们 | ${siteConfig.name}`,
  description: `加入${siteConfig.name}，一起用有趣、好玩的视角记录科技时代。`,
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

          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--c-text)' }}>加入我们</h1>
          <p className="text-lg mb-10" style={{ color: 'var(--c-text-2)' }}>{siteConfig.name} 正在寻找志同道合的伙伴。</p>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b" style={{ color: 'var(--c-text)', borderColor: 'var(--c-border)' }}>我们正在寻找</h2>
            <div className="space-y-6 text-sm" style={{ color: 'var(--c-text-2)' }}>
              <div>
                <h3 className="font-bold text-base mb-2" style={{ color: 'var(--c-text)' }}>📝 科技记者 / 撰稿人</h3>
                <p>对AI、科技商业有独到见解，能写出有深度、有趣味的文章。有作品链接优先。</p>
              </div>
              <div>
                <h3 className="font-bold text-base mb-2" style={{ color: 'var(--c-text)' }}>🎨 视觉设计师</h3>
                <p>能为我们文章和品牌设计高质量的配图、信息图和视觉形象。</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 pb-2 border-b" style={{ color: 'var(--c-text)', borderColor: 'var(--c-border)' }}>联系我们</h2>
            <p className="text-sm" style={{ color: 'var(--c-text-2)' }}>
              请发送简历/作品集至{' '}
              <a href={`mailto:${siteConfig.contact.hrEmail}`} className="hover:underline" style={{ color: 'var(--c-accent)' }}>{siteConfig.contact.hrEmail}</a>
              ，邮件标题格式：「应聘职位 + 姓名」。
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
