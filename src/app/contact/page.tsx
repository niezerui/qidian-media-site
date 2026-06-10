import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { siteConfig } from '@/lib/site.config';

export const metadata = {
  title: '联系奇点',
  description: '联系我们 - 奇点编辑部',
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="content-container py-16">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-brand-900 mb-4">联系奇点</h1>
            <p className="text-brand-500 mb-12 leading-relaxed">
              我们欢迎读者来信、商业合作、投稿等各种形式的联系。
              请通过以下方式或填写表单与我们取得联系。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
              <div className="p-6 bg-brand-50 rounded-xl">
                <div className="w-10 h-10 bg-brand-900 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-brand-900 mb-2">投稿/爆料</h3>
                <p className="text-sm text-brand-500">{siteConfig.contact.editorEmail}</p>
              </div>

              <div className="p-6 bg-brand-50 rounded-xl">
                <div className="w-10 h-10 bg-brand-900 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-brand-900 mb-2">商务合作</h3>
                <p className="text-sm text-brand-500">{siteConfig.contact.bizEmail}</p>
              </div>

              <div className="p-6 bg-brand-50 rounded-xl">
                <div className="w-10 h-10 bg-brand-900 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="font-bold text-brand-900 mb-2">加入我们</h3>
                <p className="text-sm text-brand-500">{siteConfig.contact.hrEmail}</p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white border border-brand-100 rounded-xl p-8">
              <h2 className="text-xl font-bold text-brand-900 mb-6">发送消息</h2>
              <form className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1.5">姓名</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-all text-sm"
                    placeholder="您的姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1.5">邮箱</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-all text-sm"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1.5">消息</label>
                  <textarea
                    rows={5}
                    className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-all text-sm resize-none"
                    placeholder="请输入您的消息..."
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800 transition-colors"
                >
                  发送消息
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
