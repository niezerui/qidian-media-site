import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';

// POST /api/articles/view
// 记录文章阅读量，每次访问 +1
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = parseInt(body.id);
    if (!id || isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid article id' }, { status: 400 });
    }

    await execute(`UPDATE articles SET view_count = view_count + 1 WHERE id = ?`, [id]);

    return NextResponse.json({ success: true, counted: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
