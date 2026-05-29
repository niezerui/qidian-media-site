import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '奇点 - 科技与商业深度报道',
    template: '%s | 奇点',
  },
  description: '聚焦AI大模型、具身智能、AI硬件、AI应用、零售电商、手机数码、IP游戏等领域的深度科技商业媒体。',
  keywords: ['AI', '人工智能', '大模型', '具身智能', 'AI硬件', '科技', '商业', '零售电商', '手机数码', 'IP游戏'],
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '奇点',
    title: '奇点 - 科技与商业深度报道',
    description: '聚焦AI、科技与商业的深度媒体平台',
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
        {children}
      </body>
    </html>
  );
}
