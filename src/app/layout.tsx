import type { Metadata } from 'next';
import './globals.css';
import { siteConfig } from '@/lib/site.config';

export const metadata: Metadata = {
  title: { default: siteConfig.seo.defaultTitle, template: siteConfig.seo.titleTemplate },
  description: siteConfig.slogan,
  keywords: siteConfig.seo.keywords,
  openGraph: { type: 'website', locale: 'zh_CN', siteName: siteConfig.name, title: siteConfig.seo.defaultTitle, description: siteConfig.slogan },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
