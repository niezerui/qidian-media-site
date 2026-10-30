/**
 * llms.txt / markdown 页面共用的数据读取
 *
 * 可用性优先：任何数据库异常都不能让 /llms.txt 或 .md 页面 500，
 * 因此所有查询都 try/catch 并提供兜底数据（静态分类列表）。
 */
import { query } from '@/lib/db';
import { siteConfig } from '@/lib/site.config';

export const SITE_URL = 'https://www.qidianyanjiushe.com';

export interface LlmsArticle {
  id: number;
  slug: string;
  title: string;
  summary?: string;
  author?: string;
  published_at?: string;
  category_name?: string;
  category_slug?: string;
}

export interface LlmsCategory {
  slug: string;
  name: string;
  description?: string;
}

/** 分类列表（数据库优先，失败则用站点配置，保证文件永远可生成） */
export async function getCategories(): Promise<LlmsCategory[]> {
  try {
    const rows = await query('SELECT slug, name, description FROM categories ORDER BY id');
    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((r: any) => ({
        slug: String(r.slug),
        name: String(r.name),
        description: r.description ? String(r.description) : '',
      }));
    }
  } catch { /* 降级到静态配置 */ }
  return siteConfig.categories.map(c => ({ slug: c.slug, name: c.name, description: '' }));
}

/** 最新文章（仅已发布） */
export async function getRecentArticles(limit = 50): Promise<LlmsArticle[]> {
  try {
    const rows = await query(
      `SELECT a.id, a.slug, a.title, a.summary, a.author, a.published_at,
              c.name AS category_name, c.slug AS category_slug
         FROM articles a
         JOIN categories c ON a.category_id = c.id
        WHERE (a.status IS NULL OR a.status = 'published')
        ORDER BY a.published_at DESC
        LIMIT ?`,
      [limit]
    );
    return (rows || []).map((r: any) => ({
      id: Number(r.id),
      slug: String(r.slug || r.id),
      title: String(r.title || ''),
      summary: r.summary ? String(r.summary) : '',
      author: r.author ? String(r.author) : '',
      published_at: r.published_at ? String(r.published_at) : '',
      category_name: r.category_name ? String(r.category_name) : '',
      category_slug: r.category_slug ? String(r.category_slug) : '',
    }));
  } catch {
    return [];
  }
}

/** 分类下的文章 */
export async function getArticlesByCategory(slug: string, limit = 50): Promise<LlmsArticle[]> {
  try {
    const rows = await query(
      `SELECT a.id, a.slug, a.title, a.summary, a.author, a.published_at,
              c.name AS category_name, c.slug AS category_slug
         FROM articles a
         JOIN categories c ON a.category_id = c.id
        WHERE c.slug = ? AND (a.status IS NULL OR a.status = 'published')
        ORDER BY a.published_at DESC
        LIMIT ?`,
      [slug, limit]
    );
    return (rows || []).map((r: any) => ({
      id: Number(r.id),
      slug: String(r.slug || r.id),
      title: String(r.title || ''),
      summary: r.summary ? String(r.summary) : '',
      author: r.author ? String(r.author) : '',
      published_at: r.published_at ? String(r.published_at) : '',
      category_name: r.category_name ? String(r.category_name) : '',
      category_slug: r.category_slug ? String(r.category_slug) : '',
    }));
  } catch {
    return [];
  }
}

/** 单篇文章（slug 或数字 id 均可），包含正文 */
export async function getArticleWithContent(idOrSlug: string): Promise<any | null> {
  try {
    const bySlug = await query(
      `SELECT a.*, c.name AS category_name, c.slug AS category_slug
         FROM articles a JOIN categories c ON a.category_id = c.id
        WHERE a.slug = ? AND (a.status IS NULL OR a.status = 'published') LIMIT 1`,
      [idOrSlug]
    );
    let row = bySlug?.[0];
    if (!row && /^\d+$/.test(idOrSlug)) {
      const byId = await query(
        `SELECT a.*, c.name AS category_name, c.slug AS category_slug
           FROM articles a JOIN categories c ON a.category_id = c.id
          WHERE a.id = ? AND (a.status IS NULL OR a.status = 'published') LIMIT 1`,
        [Number(idOrSlug)]
      );
      row = byId?.[0];
    }
    return row || null;
  } catch {
    return null;
  }
}

/** 静态页面的 markdown 内容（llms.txt 与 /md/static/* 共用） */
export const STATIC_PAGES: Record<string, { title: string; body: string }> = {
  about: {
    title: '关于奇点研究社',
    body: [
      `奇点研究社（Qidian Research）是一个聚焦科技与商业的独立内容团队，标语是「${siteConfig.slogan}」。`,
      '',
      '我们关注的方向包括：人工智能与大模型、具身智能、AI 硬件与芯片、AI 应用落地、零售电商、手机数码、IP 与游戏产业。',
      '',
      '内容形态以原创测评、行业观察、深度报道与「24小时快讯」实时资讯为主，主张用有趣、好玩的视角解读技术变化。',
      '',
      `- 编辑部邮箱：${siteConfig.contact.editorEmail}`,
      `- 关于页：${SITE_URL}/about`,
    ].join('\n'),
  },
  contact: {
    title: '联系奇点研究社',
    body: [
      '合作、投稿、内容纠错或读者交流，均可通过以下方式联系我们。',
      '',
      `- 编辑部 / 商务 / 招聘邮箱：${siteConfig.contact.editorEmail}`,
      '- 微信公众号、视频号：可在网站页头「公众号 / 视频号」入口扫码关注',
      `- 在线联系页：${SITE_URL}/contact`,
      '',
      '投稿建议附上文章主题、字数与配图情况，我们通常在 3 个工作日内回复。',
    ].join('\n'),
  },
  join: {
    title: '加入我们',
    body: [
      '奇点研究社长期招募兼职作者、编译与视频内容创作者。',
      '',
      '- 作者方向：AI 大模型、具身智能、AI 硬件、消费电子、零售电商',
      '- 要求：对科技行业有持续观察，能独立完成选题与成稿',
      `- 投递邮箱：${siteConfig.contact.hrEmail}`,
      `- 详情页：${SITE_URL}/join`,
    ].join('\n'),
  },
  advertise: {
    title: '广告与合作',
    body: [
      '我们提供品牌栏目合作、产品测评、活动报道与内容定制服务。',
      '',
      `- 商务邮箱：${siteConfig.contact.bizEmail}`,
      `- 合作说明页：${SITE_URL}/advertise`,
      '',
      '所有商业合作内容均会明确标注，保持编辑独立性与读者信任。',
    ].join('\n'),
  },
  privacy: {
    title: '隐私政策',
    body: [
      '本页说明奇点研究社如何收集、使用与保护访问者信息。',
      '',
      '- 我们仅收集站点运行所必需的数据（如服务端访问日志、评论者昵称）',
      '- 不使用第三方广告追踪，不出售任何用户数据',
      '- 评论内容公开可见，请在提交前自行判断敏感信息',
      `- 完整条款：${SITE_URL}/privacy`,
    ].join('\n'),
  },
};
