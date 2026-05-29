import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    const countRow = await queryOne('SELECT COUNT(*) as total FROM flash_news');
    const total = countRow?.total ?? 0;

    const offset = (page - 1) * pageSize;
    const flashes = await query(
      'SELECT * FROM flash_news ORDER BY published_at DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );

    return NextResponse.json({
      success: true,
      data: flashes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
