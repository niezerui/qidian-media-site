/**
 * /llms.txt —— 遵循 https://llmstxt.org/ 规范
 *
 * 格式约束（v2）：
 *   - H1 站点名（唯一必需项）
 *   - 引用块摘要
 *   - 若干详细说明段落
 *   - 若干 H2 分节，每节是 markdown 链接列表 [名称](url)：可选说明
 *   - 「Optional」分节用于次要信息（可跳过）
 *
 * 可用性：数据库异常时降级为静态分类，文件始终可访问（绝不 500）
 */
import { NextResponse } from 'next/server';
import { siteConfig } from '@/lib/site.config';
import { getCategories, getRecentArticles, STATIC_PAGES, SITE_URL } from '@/lib/llmsData';
import { formatDateCN } from '@/lib/md';

// 5 分钟增量刷新：新文章自动进入 llms.txt
export const revalidate = 300;

function line(title: string, url: string, note?: string): string {
  return note ? `- [${title}](${url}): ${note}` : `- [${title}](${url})`;
}

export async function GET() {
  const [categories, recent] = await Promise.all([getCategories(), getRecentArticles(50)]);

  const parts: string[] = [];

  // H1 + 摘要
  parts.push(`# ${siteConfig.name}研究社`);
  parts.push('');
  parts.push(`> ${siteConfig.slogan}。奇点研究社是一个聚焦人工智能、具身智能、AI 硬件与科技商业的中文原创媒体，提供深度报道、产品测评与「24小时快讯」实时资讯。`);
  parts.push('');

  // 详细说明
  parts.push('站点信息：');
  parts.push('');
  parts.push(`- 站点名称：${siteConfig.name}研究社（Qidian Research）`);
  parts.push(`- 网站地址：${SITE_URL}`);
  parts.push('- 内容语言：简体中文（zh-CN）');
  parts.push(`- 编辑部邮箱：${siteConfig.contact.editorEmail}`);
  parts.push('');
  parts.push('阅读本站内容的建议：');
  parts.push('');
  parts.push('- 每篇文章都提供 `.md` 纯文本版本（在原网址后加 `.md`，例如 `/article/example.md`），适合直接读取，无需解析 HTML');
  parts.push('- 本文件（llms.txt）描述全站结构；文章正文请通过下方链接进入对应的 `.md` 文件');
  parts.push('- 正文中的图片若为站内存储的 base64 内嵌图，在 `.md` 版本中会被省略（避免超大体积）；需要看图请访问 HTML 原页');
  parts.push('- 商业合作内容均会在文中标注，引用时请保留出处与原文链接');
  parts.push('');

  // 内容栏目
  parts.push('## 内容栏目');
  parts.push('');
  for (const c of categories) {
    const note = c.description ? `${c.description}；栏目文章列表见 .md 版本` : '栏目文章列表见 .md 版本';
    parts.push(line(`${c.name}`, `${SITE_URL}/category/${c.slug}.md`, note));
  }
  parts.push('');

  // 最新文章
  if (recent.length > 0) {
    parts.push('## 最新文章');
    parts.push('');
    for (const a of recent) {
      const date = formatDateCN(a.published_at);
      const noteBits = [a.category_name, a.author, date, a.summary].filter(Boolean);
      parts.push(line(a.title, `${SITE_URL}/article/${a.slug}.md`, noteBits.join(' · ')));
    }
    parts.push('');
  } else {
    parts.push('## 最新文章');
    parts.push('');
    parts.push(`- [全部文章](${SITE_URL}/articles.md): 站点文章总列表`);
    parts.push('');
  }

  // 站点页面
  parts.push('## 站点页面');
  parts.push('');
  parts.push(line('站点首页', `${SITE_URL}/index.md`, '站点定位与最新内容概览'));
  parts.push(line('全部文章', `${SITE_URL}/articles.md`, '按发布时间倒序的文章总列表'));
  for (const [slug, page] of Object.entries(STATIC_PAGES)) {
    parts.push(line(page.title, `${SITE_URL}/${slug}.md`));
  }
  parts.push('');

  // Optional
  parts.push('## Optional');
  parts.push('');
  parts.push(line('RSS 订阅源', `${SITE_URL}/feed.xml`, '最新 50 篇文章的 RSS 2.0 输出'));
  parts.push(line('站点地图', `${SITE_URL}/sitemap.xml`, '供搜索引擎使用的全部页面清单'));
  parts.push(line('HTML 首页', SITE_URL, '人可阅读的完整网页版本'));
  parts.push('');

  const body = parts.join('\n');

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      // 便于各类爬虫/代理识别该文件用途
      'X-Robots-Tag': 'all',
    },
  });
}
