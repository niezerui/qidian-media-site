import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// POST /api/admin/upload
// 将图片转为 base64 data URI，兼容 Vercel Serverless（无文件系统写入）
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: '没有上传文件' }, { status: 400 });
    }

    // 验证类型
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ success: false, error: '仅支持 JPG/PNG/GIF/WebP/SVG' }, { status: 400 });
    }

    // 大小限制 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: '图片不能超过 10MB' }, { status: 400 });
    }

    // 转 base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      success: true,
      data: {
        url: dataUri,
        originalName: file.name,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || '上传失败' }, { status: 500 });
  }
}
