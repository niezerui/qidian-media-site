import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sanitizeInput, generateSlug } from '@/lib/security';

export async function GET() {
  try {
    const categories = await query('SELECT * FROM categories ORDER BY id');
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const name = sanitizeInput((body.name || '').trim());

    if (!name) {
      return NextResponse.json({ success: false, error: '分类名称不能为空' }, { status: 400 });
    }

    if (name.length > 20) {
      return NextResponse.json({ success: false, error: '分类名称不能超过20个字符' }, { status: 400 });
    }

    let slug = generateSlug(name);
    const existing = await queryOne('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const result = await execute(
      'INSERT INTO categories (slug, name, description) VALUES (?, ?, ?)',
      [slug, name, '']
    );

    const category = await queryOne('SELECT id, slug, name FROM categories WHERE id = ?', [result.lastInsertRowid]);
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
