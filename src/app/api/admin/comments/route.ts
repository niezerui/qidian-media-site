import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/admin/comments — 后台评论管理列表
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '20'));
    const offset = (page - 1) * pageSize;

    const where = status !== 'all' ? `WHERE c.status = '${status === 'pending' ? 'pending' : status === 'spam' ? 'spam' : 'approved'}'` : '';
    const countRow = await queryOne(`SELECT COUNT(*) as total FROM comments c ${where}`);
    const total = countRow?.total ?? 0;

    const rows = await query(
      `SELECT c.*, a.title as article_title, a.slug as article_slug
       FROM comments c
       LEFT JOIN articles a ON c.article_id = a.id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    return NextResponse.json({ success: true, data: rows, total, page, pageSize });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/comments — 更新状态（approved/spam/pending）
export async function PUT(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 });
    }
    if (!['approved', 'spam', 'pending'].includes(status)) {
      return NextResponse.json({ success: false, error: '无效状态' }, { status: 400 });
    }

    await execute('UPDATE comments SET status = ? WHERE id = ?', [status, id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/comments?id=xxx — 删除评论
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少评论ID' }, { status: 400 });
    }

    // 删除评论及其回复
    await execute('DELETE FROM comments WHERE id = ? OR parent_id = ?', [id, id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
