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
  },
  alternates: {
    canonical: SITE_URL,
  },
};

// 网站结构化数据（JSON-LD）
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'NewsMediaOrganization',
  name: siteConfig.name,
  alternateName: '奇点研究社',
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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
