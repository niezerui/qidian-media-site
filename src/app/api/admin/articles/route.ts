import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sanitizeInput, sanitizeRichContent, validateArticleInput, generateSlug, extractFirstImage } from '@/lib/security';
import { rewriteContentImages } from '@/lib/image';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);

    // ---- 单篇完整读取（含 content，供编辑时加载；列表不返回 content 避免拖垮响应）----
    const singleId = searchParams.get('id');
    if (singleId) {
      const article = await queryOne(
        `SELECT a.*, c.slug as category_slug, c.name as category_name
         FROM articles a JOIN categories c ON a.category_id = c.id
         WHERE a.id = ?`,
        [Number(singleId)]
      );
      if (!article) {
        return NextResponse.json({ success: false, error: '文章不存在' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        data: {
          ...article,
          tags: JSON.parse((article as any).tags || '[]'),
          is_featured: !!(article as any).is_featured,
          is_exclusive: !!(article as any).is_exclusive,
          is_banner: !!(article as any).is_banner,
        },
      });
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));
    const status = searchParams.get('status') || 'all'; // all | published | draft

    // 全局统计（供后台跨页计数：已发布/草稿/精选/Banner）
    const countRow = await queryOne(
      `SELECT COUNT(*) as total,
              COALESCE(SUM(CASE WHEN a.status IS NULL OR a.status = 'published' THEN 1 ELSE 0 END), 0) as published,
              COALESCE(SUM(CASE WHEN a.status = 'draft' THEN 1 ELSE 0 END), 0) as draft,
              COALESCE(SUM(CASE WHEN a.is_featured = 1 THEN 1 ELSE 0 END), 0) as featured,
              COALESCE(SUM(CASE WHEN a.is_banner = 1 THEN 1 ELSE 0 END), 0) as banner
       FROM articles a`
    );
    const counts = {
      total: Number(countRow?.total ?? 0),
      published: Number(countRow?.published ?? 0),
      draft: Number(countRow?.draft ?? 0),
      featured: Number(countRow?.featured ?? 0),
      banner: Number(countRow?.banner ?? 0),
    };

    // 状态筛选（服务端过滤，保证跨页正确）
    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (status === 'draft') {
      where += " AND a.status = 'draft'";
    } else if (status === 'published') {
      where += " AND (a.status IS NULL OR a.status = 'published')";
    }

    const total = status === 'all' ? counts.total : (status === 'draft' ? counts.draft : counts.published);
    const offset = (page - 1) * pageSize;

    // 列表只取展示所需字段（不取 content，正文内嵌 base64 可能达数 MB，会拖垮后台列表）
    const articles = await query(
      `SELECT a.id, a.title, a.slug, a.summary, a.cover_image, a.category_id, a.author, a.tags,
              a.is_featured, a.is_exclusive, a.is_banner, a.view_count, a.published_at, a.created_at, a.status,
              c.name as category_name
       FROM articles a
       JOIN categories c ON a.category_id = c.id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const parsed = articles.map((a: any) => ({
      ...a,
      tags: JSON.parse(a.tags || '[]'),
      is_featured: !!a.is_featured,
      is_exclusive: !!a.is_exclusive,
      is_banner: !!a.is_banner,
    }));

    return NextResponse.json({
      success: true,
      data: parsed,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      counts,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: '请求体解析失败：内容过大或格式错误，请压缩图片后重试' }, { status: 400 });
    }

    const errors = validateArticleInput(body);
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join(', ') }, { status: 400 });
    }

    const title = sanitizeInput(body.title.trim());
    let slug = generateSlug(title);
    const existing = await queryOne('SELECT id FROM articles WHERE slug = ?', [slug]);
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const summary = sanitizeInput(body.summary || '');
    // sanitize 清理 XSS，然后对外链图片走代理（防止防盗链导致图片失效）
    const rawContent = body.content || '';
    const sanitizedContent = sanitizeRichContent(rawContent);
    const content = rewriteContentImages(sanitizedContent);
    const categoryId = parseInt(body.category_id);
    const author = sanitizeInput(body.author || '奇点编辑部');
    const tags = JSON.stringify((body.tags || []).map((t: string) => sanitizeInput(t)));
    const coverImage = body.cover_image || extractFirstImage(rawContent) || null;
    const isFeatured = body.is_featured ? 1 : 0;
    const isExclusive = body.is_exclusive ? 1 : 0;
    const isBanner = body.is_banner ? 1 : 0;
    const status = body.status === 'draft' ? 'draft' : 'published';
    const publishedAt = body.published_at || new Date().toISOString();

    const result = await execute(
      `INSERT INTO articles (title, slug, summary, content, cover_image, category_id, author, tags, is_featured, is_exclusive, is_banner, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, summary, content, coverImage, categoryId, author, tags, isFeatured, isExclusive, isBanner, status, publishedAt]
    );

    const article = await queryOne('SELECT * FROM articles WHERE id = ?', [result.lastInsertRowid]);
    return NextResponse.json({ success: true, data: article }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth();
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: '请求体解析失败：内容过大或格式错误，请压缩图片后重试' }, { status: 400 });
    }

    if (!body.id) {
      return NextResponse.json({ success: false, error: '缺少文章ID' }, { status: 400 });
    }

    // ---- 快速切换模式：只传 id + 布尔标志位（is_banner / is_featured / is_exclusive）----
    const QUICK_TOGGLE_FIELDS = ['is_banner', 'is_featured', 'is_exclusive', 'status'] as const;
    const bodyKeys = Object.keys(body).filter(k => k !== 'id');
    const isQuickToggle = bodyKeys.length > 0 && bodyKeys.every(k => (QUICK_TOGGLE_FIELDS as readonly string[]).includes(k));

    if (isQuickToggle) {
      const setParts: string[] = [];
      const params: any[] = [];
      for (const field of QUICK_TOGGLE_FIELDS) {
        if (field in body) {
          if (field === 'status') {
            setParts.push(`status = ?`);
            params.push(body.status === 'draft' ? 'draft' : 'published');
          } else {
            setParts.push(`${field} = ?`);
            params.push(body[field] ? 1 : 0);
          }
        }
      }
      setParts.push('updated_at = CURRENT_TIMESTAMP');
      params.push(body.id);
      await execute(`UPDATE articles SET ${setParts.join(', ')} WHERE id = ?`, params);
      const article = await queryOne('SELECT * FROM articles WHERE id = ?', [body.id]);
      return NextResponse.json({ success: true, data: article });
    }

    // ---- 完整更新模式 ----
    const errors = validateArticleInput(body);
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join(', ') }, { status: 400 });
    }

    const title = sanitizeInput(body.title.trim());
    const summary = sanitizeInput(body.summary || '');
    const rawContent = body.content || '';
    const sanitizedContent = sanitizeRichContent(rawContent);
    const content = rewriteContentImages(sanitizedContent);
    const categoryId = parseInt(body.category_id);
    const author = sanitizeInput(body.author || '奇点编辑部');
    const tags = JSON.stringify((body.tags || []).map((t: string) => sanitizeInput(t)));
    const coverImage = body.cover_image || extractFirstImage(rawContent) || null;
    const isFeatured = body.is_featured ? 1 : 0;
    const isExclusive = body.is_exclusive ? 1 : 0;
    const isBanner = body.is_banner ? 1 : 0;
    const status = body.status === 'draft' ? 'draft' : 'published';

    await execute(
      `UPDATE articles
       SET title = ?, summary = ?, content = ?, cover_image = ?, category_id = ?, author = ?, tags = ?, is_featured = ?, is_exclusive = ?, is_banner = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, summary, content, coverImage, categoryId, author, tags, isFeatured, isExclusive, isBanner, status, body.id]
    );

    const article = await queryOne('SELECT * FROM articles WHERE id = ?', [body.id]);
    return NextResponse.json({ success: true, data: article });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少文章ID' }, { status: 400 });
    }

    await execute('DELETE FROM articles WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
