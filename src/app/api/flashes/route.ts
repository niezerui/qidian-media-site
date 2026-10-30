import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  try {
    const flashes = await query(
      'SELECT * FROM flash_news ORDER BY published_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    const [{ count }] = await query('SELECT COUNT(*) as count FROM flash_news') as any;

    return NextResponse.json({
      flashes,
      total: count,
      page,
      limit,
      hasMore: offset + flashes.length < count,
    });
  } catch (error) {
    return NextResponse.json({ flashes: [], total: 0, page, limit, hasMore: false }, { status: 500 });
  }
}
