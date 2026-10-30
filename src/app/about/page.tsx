import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { siteConfig } from '@/lib/site.config';
import { query } from '@/lib/db';

export const metadata: Metadata = {
  title: `关于我们 | ${siteConfig.name}`,
  description: `${siteConfig.name}——${siteConfig.slogan}。了解我们的团队、理念和联系方式。`,
  alternates: {
    canonical: 'https://www.qidianyanjiushe.com/about',
    types: {
      // llms.txt 规范：本页的 Markdown 版本
      'text/markdown': '/about.md',
      'text/plain': '/llms.txt',
    },
  },
};

export const revalidate = 60; // 页脚分类读库，ISR 定期刷新

const SITE_URL = 'https://www.qidianyanjiushe.com';

async function getCategories(): Promise<{ slug: string; name: string }[]> {
  try {
    const rows = await query('SELECT slug, name FROM categories ORDER BY id');
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((r: any) => ({ slug: r.slug, name: r.name }));
    }
  } catch { /* 回退静态配置 */ }
  return siteConfig.categories;
}

export default async function AboutPage() {
  const categories = await getCategories();
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
          <div className="flex items-center gap-3 mb-3">
            <span className="w-[10px] h-[26px]" style={{ backgroundColor: 'var(--c-accent)' }} />
            <h1 className="text-3xl font-black" style={{ color: '#000' }}>关于{siteConfig.name}</h1>
            <span className="text-[11px] font-bold pt-1" style={{ color: '#999', letterSpacing: '0.22em', fontFamily: 'var(--font-mono)' }}>ABOUT US</span>
          </div>
          <p className="text-lg mb-10 pl-[18px]" style={{ color: 'var(--c-text-2)' }}>{siteConfig.slogan}</p>

          {/* 品牌故事 */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: 'var(--c-border)' }}>
              <span className="w-[7px] h-[18px]" style={{ backgroundColor: 'var(--c-accent)' }} />
              <h2 className="text-xl font-black" style={{ color: '#000' }}>品牌故事</h2>
              <span className="text-[10px] font-bold pt-px" style={{ color: '#999', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>STORY</span>
            </div>
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
                我们试图用<span className="px-1 font-bold" style={{ backgroundColor: 'var(--c-accent)', color: '#000' }}>有趣、好玩的视角</span>，
                去记录这个时代最值得关注的科技变革。
              </p>
            </div>
          </section>

          {/* 关注领域 */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: 'var(--c-border)' }}>
              <span className="w-[7px] h-[18px]" style={{ backgroundColor: 'var(--c-accent)' }} />
              <h2 className="text-xl font-black" style={{ color: '#000' }}>关注领域</h2>
              <span className="text-[10px] font-bold pt-px" style={{ color: '#999', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>FIELDS</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {categories.map(c => (
                <Link
                  key={c.slug}
                  href={`/category/${c.slug}`}
                  className="group block text-center text-sm font-medium px-4 py-3.5 border transition-colors hover:bg-black hover:text-white"
                  style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </section>

          {/* 联系方式 */}
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b" style={{ borderColor: 'var(--c-border)' }}>
              <span className="w-[7px] h-[18px]" style={{ backgroundColor: 'var(--c-accent)' }} />
              <h2 className="text-xl font-black" style={{ color: '#000' }}>联系方式</h2>
              <span className="text-[10px] font-bold pt-px" style={{ color: '#999', letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>CONTACT</span>
            </div>
            <div className="space-y-3 text-sm" style={{ color: 'var(--c-text-2)' }}>
              <p>
                <strong style={{ color: 'var(--c-text)' }}>编辑部邮箱：</strong>
                <a href={`mailto:${siteConfig.contact.editorEmail}`} className="font-bold underline underline-offset-4 hover:opacity-60" style={{ color: '#000', textDecorationColor: 'var(--c-accent)' }}>{siteConfig.contact.editorEmail}</a>
              </p>
              <p>
                <strong style={{ color: 'var(--c-text)' }}>商务合作：</strong>
                <a href={`mailto:${siteConfig.contact.bizEmail}`} className="font-bold underline underline-offset-4 hover:opacity-60" style={{ color: '#000', textDecorationColor: 'var(--c-accent)' }}>{siteConfig.contact.bizEmail}</a>
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
