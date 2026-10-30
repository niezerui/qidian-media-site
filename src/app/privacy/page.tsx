import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { siteConfig } from '@/lib/site.config';

export const revalidate = 60; // 页脚分类读库，ISR 定期刷新

export const metadata: Metadata = {
  title: `隐私政策 | ${siteConfig.name}`,
  description: `${siteConfig.name}隐私政策：说明我们如何收集、使用和保护您的个人信息。`,
  alternates: {
    canonical: 'https://www.qidianyanjiushe.com/privacy',
    types: {
      // llms.txt 规范：本页的 Markdown 版本
      'text/markdown': '/privacy.md',
      'text/plain': '/llms.txt',
    },
  },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-white">
        <div className="site-container py-10 lg:py-14">
          <div className="max-w-3xl mx-auto">
            {/* 页头 */}
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <span className="w-[10px] h-[26px] bg-gold-grad" />
                <h1 className="text-2xl sm:text-[32px] font-black leading-none" style={{ color: '#000000', letterSpacing: '0.02em' }}>隐私政策</h1>
                <span className="text-[10px] sm:text-xs font-bold pt-1 text-gold-grad" style={{ letterSpacing: '0.2em', fontFamily: 'var(--font-mono)' }}>PRIVACY</span>
              </div>
              <div className="mt-4 h-px w-full line-gold-grad" />
            </div>

            <div className="space-y-8 text-[15px] leading-[1.9]" style={{ color: 'var(--c-text-2)' }}>
              <section>
                <h2 className="text-lg font-black mb-3" style={{ color: '#000' }}>1. 信息收集</h2>
                <p>在您访问本站时，我们会自动收集有限的访问信息（如浏览器类型、访问时间、来源页面），用于统计分析网站流量与内容受欢迎程度。这些数据不用于识别个人身份。</p>
                <p className="mt-2">当您使用评论、留言等功能时，我们会收集您主动提供的信息（如昵称、评论内容、联系邮箱）。</p>
              </section>

              <section>
                <h2 className="text-lg font-black mb-3" style={{ color: '#000' }}>2. 信息使用</h2>
                <p>收集的信息仅用于：改进网站内容与服务、回复您的咨询与投稿、防止恶意评论与滥用行为。我们不会将您的个人信息出售或提供给任何第三方（法律法规要求除外）。</p>
              </section>

              <section>
                <h2 className="text-lg font-black mb-3" style={{ color: '#000' }}>3. Cookie 与本地存储</h2>
                <p>本站使用必要的 Cookie 维持网站基本功能（如登录状态、浏览统计）。您可以通过浏览器设置清除或禁用 Cookie，但这可能影响部分功能的使用体验。</p>
              </section>

              <section>
                <h2 className="text-lg font-black mb-3" style={{ color: '#000' }}>4. 第三方服务</h2>
                <p>本站可能嵌入第三方内容（如视频播放器）或使用第三方统计分析服务，这些服务有自己的隐私政策，本站不对其数据处理行为承担责任。</p>
              </section>

              <section>
                <h2 className="text-lg font-black mb-3" style={{ color: '#000' }}>5. 信息安全</h2>
                <p>我们采取合理的技术与管理措施保护您的信息安全，包括传输加密、访问控制等。尽管如此，互联网传输不存在绝对安全，我们建议您不要在评论等公开区域透露敏感个人信息。</p>
              </section>

              <section>
                <h2 className="text-lg font-black mb-3" style={{ color: '#000' }}>6. 未成年人保护</h2>
                <p>本站内容面向一般公众。我们不会有意收集未满 14 周岁未成年人的个人信息；如发现此类信息被误收集，将及时删除。</p>
              </section>

              <section>
                <h2 className="text-lg font-black mb-3" style={{ color: '#000' }}>7. 政策更新与联系方式</h2>
                <p>本政策可能不定期更新，更新后将在本页面发布。如您对隐私政策有任何疑问或请求（如查询、更正、删除您的个人信息），请联系：<span style={{ color: '#000' }} className="font-medium">{siteConfig.contact.editorEmail}</span>。</p>
                <p className="mt-2 text-sm" style={{ color: 'var(--c-text-3)' }}>最近更新：2026 年 9 月</p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
