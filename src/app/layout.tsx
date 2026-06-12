import type { Metadata } from 'next';
import './globals.css';
import { siteConfig } from '@/lib/site.config';

const SITE_URL = 'https://www.qidianyanjiushe.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: siteConfig.seo.defaultTitle, template: siteConfig.seo.titleTemplate },
  description: siteConfig.slogan,
  keywords: siteConfig.seo.keywords,
  authors: [{ name: siteConfig.name, url: SITE_URL }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: SITE_URL,
    siteName: siteConfig.name,
    title: siteConfig.seo.defaultTitle,
    description: siteConfig.slogan,
    images: [{ url: `${SITE_URL}/logo.png`, width: 512, height: 512, alt: siteConfig.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.seo.defaultTitle,
    description: siteConfig.slogan,
    images: [`${SITE_URL}/logo.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  verification: {
    google: 'google513fd85c5bf9a326',
    // 百度验证（在百度搜索资源平台获取验证码后填入）
    other: siteConfig.seo.baiduVerification
      ? { 'baidu-site-verification': siteConfig.seo.baiduVerification }
      : {},
  },
  alternates: {
    canonical: SITE_URL,
  },
  other: {
    // 百度爬虫专用 meta（当百度验证未配置时留空）
    ...(siteConfig.seo.baiduVerification
      ? { 'baidu-site-verification': siteConfig.seo.baiduVerification }
      : {}),
  },
};

// 网站结构化数据（JSON-LD）— 品牌别名全覆盖
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: siteConfig.name,
  alternateName: [
    '奇点研究社',
    '奇点',
    '奇博士',
    'Qidian',
    'Qidian Research',
    'qidianyanjiushe',
  ],
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/logo.png`,
    width: 512,
    height: 512,
  },
  description: siteConfig.slogan,
  foundingDate: '2024',
  contactPoint: {
    '@type': 'ContactPoint',
    email: siteConfig.contact.editorEmail,
    contactType: 'editorial',
    availableLanguage: 'Chinese',
  },
  sameAs: [],
  // 告诉搜索引擎可用的关键词（非作弊，只列真实品牌词）
  knowsAbout: [
    '人工智能',
    'AI大模型',
    '具身智能',
    '科技测评',
    '科技商业',
    '零售电商',
    '手机数码',
  ],
};

// WebSite 结构化数据（启用 Google Sitelinks Search Box）
const webSiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  alternateName: ['奇点', '奇博士', 'Qidian'],
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/?search={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
  publisher: {
    '@type': 'NewsMediaOrganization',
    name: siteConfig.name,
    url: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 中文语言标识 — 帮助百度/Google 正确识别语言 */}
        <meta httpEquiv="Content-Language" content="zh-CN" />
        <meta name="language" content="zh-CN" />

        {/* 移动端优化 */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

        {/* 主题色 — 改善移动端浏览器 UI */}
        <meta name="theme-color" content="#121212" />
        <meta name="msapplication-TileColor" content="#121212" />

        {/* 百度搜索资源平台验证（若有） */}
        {siteConfig.seo.baiduVerification && (
          <meta name="baidu-site-verification" content={siteConfig.seo.baiduVerification} />
        )}

        {/* 结构化数据 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
