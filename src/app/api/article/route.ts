import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Missing slug' }, { status: 400 });
    }

    const article = await queryOne(
      `SELECT a.*, c.slug as category_slug, c.name as category_name
       FROM articles a JOIN categories c ON a.category_id = c.id
       WHERE a.slug = ?`,
      [slug]
    );

    if (!article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    const parsed = {
      ...article,
      tags: JSON.parse((article as any).tags || '[]'),
      is_featured: !!(article as any).is_featured,
      is_exclusive: !!(article as any).is_exclusive,
    };

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
