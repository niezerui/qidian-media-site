import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sanitizeInput, sanitizeRichContent, validateFlashInput } from '@/lib/security';

export async function GET() {
  try {
    await requireAuth();
    const db = getDb();
    const flashes = db.prepare('SELECT * FROM flash_news ORDER BY created_at DESC LIMIT 100').all();
    return NextResponse.json({ success: true, data: flashes });
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

    const errors = validateFlashInput(body);
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join(', ') }, { status: 400 });
    }

    const db = getDb();
    const title = sanitizeInput(body.title.trim());
    const content = sanitizeRichContent(body.content || '');
    const dateLabel = sanitizeInput(body.date_label || '');
    const publishedAt = body.published_at || new Date().toISOString();

    const result = db.prepare(
      'INSERT INTO flash_news (title, content, date_label, published_at) VALUES (?, ?, ?, ?)'
    ).run(title, content, dateLabel, publishedAt);

    const flash = db.prepare('SELECT * FROM flash_news WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json({ success: true, data: flash }, { status: 201 });
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
      return NextResponse.json({ success: false, error: '缺少快讯ID' }, { status: 400 });
    }
    const db = getDb();
    db.prepare('DELETE FROM flash_news WHERE id = ?').run(id);
    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
