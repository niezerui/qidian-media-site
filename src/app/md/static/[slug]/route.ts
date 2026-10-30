/**
 * 静态页面的 Markdown 版本（关于 / 联系 / 加入我们 / 广告合作 / 隐私政策）
 * 对外 URL：/about.md、/contact.md、/join.md、/advertise.md、/privacy.md
 */
import { NextResponse } from 'next/server';
import { STATIC_PAGES, SITE_URL } from '@/lib/llmsData';

export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug || '');
  const page = STATIC_PAGES[slug];

  if (!page) {
    return new NextResponse(`# 页面不存在\n\n- 站点内容索引：${SITE_URL}/llms.txt\n`, {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    });
  }

  const md = [
    `# ${page.title}`,
    '',
    page.body,
    '',
    '---',
    '',
    `HTML 版本：${SITE_URL}/${slug}`,
    '',
  ].join('\n');

  return new NextResponse(md, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      Link: `<${SITE_URL}/${slug}>; rel="alternate"; type="text/html", <${SITE_URL}/llms.txt>; rel="describedby"`,
    },
  });
}
