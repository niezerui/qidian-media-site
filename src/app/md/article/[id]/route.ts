/**
 * 单篇文章的 Markdown 版本
 * 对外 URL：/article/<slug|id>.md （由 next.config.js rewrites 映射到本路由）
 *
 * 说明：正文中的 base64 内嵌图片会被省略，避免输出文件过大；
 * 外链图片以 markdown 形式保留。
 */
import { NextResponse } from 'next/server';
import { getArticleWithContent, SITE_URL } from '@/lib/llmsData';
import { htmlToMarkdown, excerptFromHtml, formatDateCN } from '@/lib/md';

export const revalidate = 300;

function notFound(id: string) {
  return new NextResponse(`# 文章不存在\n\n未找到 slug/id 为 \`${id}\` 的已发布文章。\n\n- 全部文章列表：${SITE_URL}/articles.md\n`, {
    status: 404,
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const article = await getArticleWithContent(decodeURIComponent(params.id || ''));
  if (!article) return notFound(params.id || '');

  const summary = article.summary || excerptFromHtml(article.content || '', 140);
  const body = htmlToMarkdown(article.content || '', SITE_URL);
  const url = `${SITE_URL}/article/${article.slug || article.id}`;

  const md = [
    `# ${article.title}`,
    '',
    summary ? `> ${summary}` : '',
    '',
    `- 分类：${article.category_name || '未分类'}`,
    `- 作者：${article.author || '奇点编辑部'}`,
    `- 发布时间：${formatDateCN(article.published_at)}`,
    `- 原文链接：${url}`,
    `- 文章 ID：${article.id}`,
    '',
    '---',
    '',
    body || '（本文暂无正文文本内容）',
    '',
    '---',
    '',
    `本文由奇点研究社发布，引用请注明出处：${url}`,
    '',
  ].filter(l => l !== undefined).join('\n');

  return new NextResponse(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      // 声明 markdown 版本与 HTML 原页的对应关系，便于客户端发现
      Link: `<${url}>; rel="alternate"; type="text/html", <${SITE_URL}/llms.txt>; rel="describedby"`,
    },
  });
}
