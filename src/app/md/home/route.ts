/**
 * 站点首页的 Markdown 版本
 * 对外 URL：/index.md
 */
import { NextResponse } from 'next/server';
import { siteConfig } from '@/lib/site.config';
import { getCategories, getRecentArticles, SITE_URL } from '@/lib/llmsData';
import { formatDateCN } from '@/lib/md';

export const revalidate = 300;

export async function GET() {
  const [categories, recent] = await Promise.all([getCategories(), getRecentArticles(20)]);

  const md = [
    `# ${siteConfig.name}研究社`,
    '',
    `> ${siteConfig.slogan}`,
    '',
    `${siteConfig.description}。奇点研究社聚焦人工智能、具身智能、AI 硬件与科技商业领域，提供原创深度报道、产品测评与「24小时快讯」实时资讯。`,
    '',
    `- 网站：${SITE_URL}`,
    `- 内容索引（llms.txt）：${SITE_URL}/llms.txt`,
    `- RSS 订阅：${SITE_URL}/feed.xml`,
    `- 编辑部邮箱：${siteConfig.contact.editorEmail}`,
    '',
    '## 内容栏目',
    '',
    ...categories.map(c => `- ${c.name}：${SITE_URL}/category/${c.slug}.md`),
    '',
    '## 最新内容',
    '',
    ...(recent.length > 0
      ? recent.map(a => {
          const bits = [a.category_name, formatDateCN(a.published_at), a.summary].filter(Boolean);
          return `- [${a.title}](${SITE_URL}/article/${a.slug}.md)${bits.length ? `: ${bits.join(' · ')}` : ''}`;
        })
      : [`- 全部文章：${SITE_URL}/articles.md`]),
    '',
  ].join('\n');

  return new NextResponse(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      Link: `<${SITE_URL}>; rel="alternate"; type="text/html", <${SITE_URL}/llms.txt>; rel="describedby"`,
    },
  });
}
