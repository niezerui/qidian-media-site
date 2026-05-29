import type { Metadata } from 'next';
import './globals.css';
import { siteConfig } from '@/lib/site.config';

export const metadata: Metadata = {
  title: {
    default: siteConfig.seo.defaultTitle,
    template: siteConfig.seo.titleTemplate,
  },
  description: siteConfig.slogan,
  keywords: siteConfig.seo.keywords,
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: siteConfig.name,
    title: siteConfig.seo.defaultTitle,
    description: siteConfig.slogan,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --color-primary: ${siteConfig.colors.primary};
            --color-accent: ${siteConfig.colors.accent};
            --color-bg: ${siteConfig.colors.background};
            --color-surface: ${siteConfig.colors.surface};
            --color-border: ${siteConfig.colors.border};
            --color-text: ${siteConfig.colors.textPrimary};
            --color-text-secondary: ${siteConfig.colors.textSecondary};
            --color-text-muted: ${siteConfig.colors.textMuted};
            --color-footer: ${siteConfig.colors.footer};
          }
          .article-body { color: var(--color-text); line-height: 1.8; }
          .article-body h2 { font-size: 1.4rem; font-weight: 700; margin: 2rem 0 1rem; color: var(--color-text); }
          .article-body h3 { font-size: 1.15rem; font-weight: 600; margin: 1.5rem 0 0.75rem; }
          .article-body p { margin: 1rem 0; }
          .article-body img { max-width: 100%; height: auto; border-radius: 12px; margin: 1.5rem 0; }
          .article-body video, .article-body iframe { max-width: 100%; border-radius: 12px; margin: 1.5rem 0; }
          .article-body a { color: var(--color-accent); text-decoration: underline; }
          .article-body blockquote { border-left: 3px solid var(--color-border); padding-left: 1.5rem; color: var(--color-text-secondary); margin: 1.5rem 0; font-style: italic; }
          .article-body ul, .article-body ol { padding-left: 1.5rem; margin: 1rem 0; }
          .article-body li { margin: 0.35rem 0; }
          .article-body section { margin: 1.5rem 0; }
          .article-body span { color: inherit; }
        `}} />
        {children}
      </body>
    </html>
  );
}
