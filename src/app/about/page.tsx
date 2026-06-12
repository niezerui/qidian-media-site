import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';

export const metadata: Metadata = {
  title: `关于我们 | ${siteConfig.name}`,
  description: `${siteConfig.name}——${siteConfig.slogan}。了解我们的团队、理念和联系方式。`,
};

const SITE_URL = 'https://www.qidianyanjiushe.com';

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="site-container py-12 max-w-3xl">
          {/* 面包屑 */}
          <nav className="flex items-center gap-1.5 text-sm mb-8" style={{ color: 'var(--c-text-3)' }}>
            <Link href="/" className="hover:underline">首页</Link><span>/</span>
            <span style={{ color: 'var(--c-text-2)' }}>关于我们</span>
          </nav>

          {/* 标题 */}
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--c-text)' }}>关于{siteConfig.name}</h1>
          <p className="text-lg mb-10" style={{ color: 'var(--c-text-2)' }}>{siteConfig.slogan}</p>

          {/* 品牌故事 */}
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b" style={{ color: 'var(--c-text)', borderColor: 'var(--c-border)' }}>品牌故事</h2>
            <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--c-text-2)' }}>
              <p>
                <strong style={{ color: 'var(--c-text)' }}>{siteConfig.name}</strong>（Qidian Research）成立于2024年，
                是一家专注于科技与商业交叉领域的独立研究媒体。
              </p>
              <p>
                我们相信，真正有价值的科技报道不应该只是产品的罗列和参数的比拼，
                而应该去理解技术背后的商业逻辑、人文关怀和社会影响。
              </p>
              <p>
                从AI大模型的爆发到具身智能的崛起，从零售电商的变迁到手机数码的迭代，
                我们试图用<strong style={{ color: 'var(--c-accent)', background: 'var(--c-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>有趣、好玩的视角</strong>，
                去记录这个时代最值得关注的科技变革。
              </p>
            </div>
          </section>

          {/* 关注领域 */}
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b" style={{ color: 'var(--c-text)', borderColor: 'var(--c-border)' }}>关注领域</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {siteConfig.categories.map(c => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="block text-center text-sm font-medium px-4 py-3 rounded-lg border transition-colors hover:border-brand-900 hover:text-brand-900"
                  style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>

          {/* 联系方式 */}
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4 pb-2 border-b" style={{ color: 'var(--c-text)', borderColor: 'var(--c-border)' }}>联系方式</h2>
            <div className="space-y-3 text-sm" style={{ color: 'var(--c-text-2)' }}>
              <p>
                <strong style={{ color: 'var(--c-text)' }}>编辑部邮箱：</strong>
                <a href={`mailto:${siteConfig.contact.editorEmail}`} className="hover:underline" style={{ color: 'var(--c-accent)' }}>{siteConfig.contact.editorEmail}</a>
              </p>
              <p>
                <strong style={{ color: 'var(--c-text)' }}>商务合作：</strong>
                <a href={`mailto:${siteConfig.contact.bizEmail}`} className="hover:underline" style={{ color: 'var(--c-accent)' }}>{siteConfig.contact.bizEmail}</a>
              </p>
            </div>
          </section>

          {/* 结构化数据（本页） */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'AboutPage',
              name: `关于${siteConfig.name}`,
              description: metadata.description,
              url: `${SITE_URL}/about`,
              mainEntity: {
                '@type': 'NewsMediaOrganization',
                name: siteConfig.name,
                alternateName: ['奇点', '奇博士', 'Qidian'],
                url: SITE_URL,
                description: siteConfig.slogan,
                foundingDate: '2024',
              },
            }) }}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
