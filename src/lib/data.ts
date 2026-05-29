// 共享的数据查询函数 — 直接调数据库，不通过 HTTP
import { query, queryOne } from '@/lib/db';

export async function getArticles(params: {
  page?: number;
  pageSize?: number;
  category?: string;
  featured?: string;
  search?: string;
}) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 12));
  const { category, featured, search } = params;

  let whereClause = 'WHERE 1=1';
  const args: any[] = [];

  if (category) { whereClause += ' AND c.slug = ?'; args.push(category); }
  if (featured === '1') { whereClause += ' AND a.is_featured = 1'; }
  if (search) { whereClause += ' AND (a.title LIKE ? OR a.summary LIKE ?)'; args.push(`%${search}%`, `%${search}%`); }

  const countRow = await queryOne(`SELECT COUNT(*) as total FROM articles a JOIN categories c ON a.category_id = c.id ${whereClause}`, args);
  const total = (countRow as any)?.total ?? 0;

  const offset = (page - 1) * pageSize;
  const rows = await query(
    `SELECT a.*, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id ${whereClause} ORDER BY a.is_featured DESC, a.published_at DESC LIMIT ? OFFSET ?`,
    [...args, pageSize, offset]
  );

  const data = rows.map((a: any) => ({ ...a, tags: JSON.parse(a.tags || '[]'), is_featured: !!a.is_featured, is_exclusive: !!a.is_exclusive }));

  return { success: true, data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getFlashes(params: { page?: number; pageSize?: number }) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(50, Math.max(1, params.pageSize || 20));
  const countRow = await queryOne('SELECT COUNT(*) as total FROM flash_news');
  const total = (countRow as any)?.total ?? 0;
  const offset = (page - 1) * pageSize;
  const data = await query('SELECT * FROM flash_news ORDER BY published_at DESC LIMIT ? OFFSET ?', [pageSize, offset]);
  return { success: true, data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getArticleBySlug(slug: string) {
  const articles = await query(
    `SELECT a.*, c.slug as category_slug, c.name as category_name FROM articles a JOIN categories c ON a.category_id = c.id`,
    []
  );
  const found = articles.find((a: any) => a.slug === slug);
  if (!found) return null;
  const related = articles.filter((a: any) => a.id !== found.id && a.category_id === found.category_id).slice(0, 3);
  return { article: { ...found, tags: JSON.parse(found.tags || '[]') }, related };
}

export async function getFlashById(id: number) {
  const row = await queryOne('SELECT * FROM flash_news WHERE id = ?', [id]);
  return row || null;
}
