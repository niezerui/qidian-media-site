import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, verifyPassword, hashPassword } from '@/lib/auth';
import { execute, queryOne } from '@/lib/db';
import { sanitizeInput } from '@/lib/security';

export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireAuth();

    const body = await request.json();
    const oldPassword = body.oldPassword || '';
    const newPassword = sanitizeInput(body.newPassword || '');

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: '请输入旧密码和新密码' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: '新密码至少需要6个字符' },
        { status: 400 }
      );
    }

    // Verify old password
    const user = await queryOne('SELECT * FROM admin_users WHERE id = ?', [authUser.userId]);
    if (!user || !verifyPassword(oldPassword, user.password_hash)) {
      return NextResponse.json(
        { success: false, error: '旧密码错误' },
        { status: 401 }
      );
    }

    // Update password
    const newHash = hashPassword(newPassword);
    await execute('UPDATE admin_users SET password_hash = ? WHERE id = ?', [newHash, authUser.userId]);

    return NextResponse.json({ success: true, data: { message: '密码修改成功' } });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
