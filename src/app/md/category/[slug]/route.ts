/**
 * 栏目（分类）文章列表的 Markdown 版本
 * 对外 URL：/category/<slug>.md
 */
import { NextResponse } from 'next/server';
import { getArticlesByCategory, getCategories, SITE_URL } from '@/lib/llmsData';
import { formatDateCN } from '@/lib/md';

export const revalidate = 300;

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug || '');
  const categories = await getCategories();
  const category = categories.find(c => c.slug === slug);

  if (!category) {
    return new NextResponse(`# 栏目不存在\n\n未找到 slug 为 \`${slug}\` 的栏目。\n\n- 站点内容索引：${SITE_URL}/llms.txt\n`, {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  }

  const articles = await getArticlesByCategory(slug, 60);

  const md = [
    `# ${category.name}`,
    '',
    `> ${category.description || `${category.name}栏目的最新文章列表`}（共 ${articles.length} 篇，按发布时间倒序）`,
    '',
    `- HTML 栏目页：${SITE_URL}/category/${slug}`,
    `- 站点内容索引：${SITE_URL}/llms.txt`,
    '',
    '## 文章列表',
    '',
    ...(articles.length > 0
      ? articles.map(a => {
          const bits = [formatDateCN(a.published_at), a.author, a.summary].filter(Boolean);
          return `- [${a.title}](${SITE_URL}/article/${a.slug}.md)${bits.length ? `: ${bits.join(' · ')}` : ''}`;
        })
      : ['- （该栏目暂无已发布文章）']),
    '',
  ].join('\n');

  return new NextResponse(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      Link: `<${SITE_URL}/category/${slug}>; rel="alternate"; type="text/html", <${SITE_URL}/llms.txt>; rel="describedby"`,
    },
  });
}
