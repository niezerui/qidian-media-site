import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sanitizeInput, sanitizeRichContent, validateArticleInput, generateSlug, extractFirstImage } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    const countRow = await queryOne('SELECT COUNT(*) as total FROM articles');
    const total = countRow?.total ?? 0;
    const offset = (page - 1) * pageSize;

    const articles = await query(
      `SELECT a.*, c.name as category_name
       FROM articles a
       JOIN categories c ON a.category_id = c.id
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    const parsed = articles.map((a: any) => ({
      ...a,
      tags: JSON.parse(a.tags || '[]'),
      is_featured: !!a.is_featured,
      is_exclusive: !!a.is_exclusive,
    }));

    return NextResponse.json({
      success: true,
      data: parsed,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
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
    const body = await request.json();

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
    const content = sanitizeRichContent(body.content || '');
    const categoryId = parseInt(body.category_id);
    const author = sanitizeInput(body.author || '奇点编辑部');
    const tags = JSON.stringify((body.tags || []).map((t: string) => sanitizeInput(t)));
    const coverImage = body.cover_image || extractFirstImage(body.content) || null;
    const isFeatured = body.is_featured ? 1 : 0;
    const isExclusive = body.is_exclusive ? 1 : 0;
    const publishedAt = body.published_at || new Date().toISOString();

    const result = await execute(
      `INSERT INTO articles (title, slug, summary, content, cover_image, category_id, author, tags, is_featured, is_exclusive, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, summary, content, coverImage, categoryId, author, tags, isFeatured, isExclusive, publishedAt]
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
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ success: false, error: '缺少文章ID' }, { status: 400 });
    }

    const errors = validateArticleInput(body);
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join(', ') }, { status: 400 });
    }

    const title = sanitizeInput(body.title.trim());
    const summary = sanitizeInput(body.summary || '');
    const content = sanitizeRichContent(body.content || '');
    const categoryId = parseInt(body.category_id);
    const author = sanitizeInput(body.author || '奇点编辑部');
    const tags = JSON.stringify((body.tags || []).map((t: string) => sanitizeInput(t)));
    const coverImage = body.cover_image || extractFirstImage(body.content) || null;
    const isFeatured = body.is_featured ? 1 : 0;
    const isExclusive = body.is_exclusive ? 1 : 0;

    await execute(
      `UPDATE articles
       SET title = ?, summary = ?, content = ?, cover_image = ?, category_id = ?, author = ?, tags = ?, is_featured = ?, is_exclusive = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, summary, content, coverImage, categoryId, author, tags, isFeatured, isExclusive, body.id]
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
