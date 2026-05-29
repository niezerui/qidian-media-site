import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '12')));
    const category = searchParams.get('category') || '';
    const featured = searchParams.get('featured');
    const search = searchParams.get('search') || '';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (category) {
      whereClause += ' AND c.slug = ?';
      params.push(category);
    }

    if (featured === '1') {
      whereClause += ' AND a.is_featured = 1';
    }

    if (search) {
      whereClause += ' AND (a.title LIKE ? OR a.summary LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countSql = `
      SELECT COUNT(*) as total
      FROM articles a
      JOIN categories c ON a.category_id = c.id
      ${whereClause}
    `;
    const countRow = await queryOne(countSql, params);
    const total = countRow?.total ?? 0;

    const offset = (page - 1) * pageSize;
    const dataSql = `
      SELECT a.*, c.slug as category_slug, c.name as category_name
      FROM articles a
      JOIN categories c ON a.category_id = c.id
      ${whereClause}
      ORDER BY a.is_featured DESC, a.published_at DESC
      LIMIT ? OFFSET ?
    `;

    const articles = await query(dataSql, [...params, pageSize, offset]);

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
