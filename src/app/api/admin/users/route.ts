import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sanitizeInput } from '@/lib/security';

// GET /api/admin/users — 获取所有管理员用户
export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const users = await query(
      'SELECT id, username, created_at FROM admin_users ORDER BY created_at DESC'
    );
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/users — 新增管理员
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const username = sanitizeInput((body.username || '').trim());
    const password = (body.password || '').trim();

    if (!username || username.length < 3) {
      return NextResponse.json({ success: false, error: '用户名至少3个字符' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: '密码至少6个字符' }, { status: 400 });
    }

    // 检查用户名是否已存在
    const existing = await queryOne('SELECT id FROM admin_users WHERE username = ?', [username]);
    if (existing) {
      return NextResponse.json({ success: false, error: '用户名已存在' }, { status: 409 });
    }

    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(password, 10);
    const result = await execute(
      'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
      [username, hash]
    );

    return NextResponse.json({
      success: true,
      data: { id: Number(result.lastInsertRowid), username },
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/users?id=xxx — 删除管理员（不能删自己/最后一个）
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });
    }

    // 不能删自己
    if (String(currentUser.userId) === String(id)) {
      return NextResponse.json({ success: false, error: '不能删除当前登录账号' }, { status: 400 });
    }

    // 不能删最后一个管理员
    const countRow = await queryOne('SELECT COUNT(*) as cnt FROM admin_users');
    if ((countRow?.cnt ?? 0) <= 1) {
      return NextResponse.json({ success: false, error: '至少保留一个管理员账号' }, { status: 400 });
    }

    await execute('DELETE FROM admin_users WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
