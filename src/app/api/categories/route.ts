import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 必须动态：否则生产环境 GET 会被构建时静态缓存，后台增删分类前端永远不更新
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 排序依据后台「分类管理」维护的 sort_order；未排序的（NULL）排在最后再按 id 兜底
    const categories = await query(
      'SELECT id, slug, name, description FROM categories ORDER BY (sort_order IS NULL), sort_order, id'
    );
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
