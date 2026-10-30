/**
 * 全部文章列表的 Markdown 版本
 * 对外 URL：/articles.md
 */
import { NextResponse } from 'next/server';
import { getRecentArticles, SITE_URL } from '@/lib/llmsData';
import { formatDateCN } from '@/lib/md';

export const revalidate = 300;

export async function GET() {
  const articles = await getRecentArticles(200);

  const md = [
    '# 奇点研究社 · 全部文章',
    '',
    `> 按发布时间倒序的文章总列表（共 ${articles.length} 篇）。每篇文章都提供 .md 纯文本版本，链接见下方列表。`,
    '',
    `- HTML 列表页：${SITE_URL}/articles`,
    `- 站点内容索引：${SITE_URL}/llms.txt`,
    '',
    '## 文章列表',
    '',
    ...(articles.length > 0
      ? articles.map(a => {
          const bits = [a.category_name, formatDateCN(a.published_at), a.author].filter(Boolean);
          return `- [${a.title}](${SITE_URL}/article/${a.slug}.md)${bits.length ? `: ${bits.join(' · ')}` : ''}`;
        })
      : ['- （暂无已发布文章）']),
    '',
  ].join('\n');

  return new NextResponse(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      Link: `<${SITE_URL}/articles>; rel="alternate"; type="text/html", <${SITE_URL}/llms.txt>; rel="describedby"`,
    },
  });
}
