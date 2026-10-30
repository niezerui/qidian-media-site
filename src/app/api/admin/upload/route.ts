import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { compressImageBuffer } from '@/lib/serverImage';

// POST /api/admin/upload
// 将图片压缩后转为 base64 data URI，兼容 Vercel Serverless（无文件系统写入）
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: '没有上传文件' }, { status: 400 });
    }

    // 验证类型
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ success: false, error: '仅支持 JPG/PNG/GIF/WebP/SVG/AVIF 格式' }, { status: 400 });
    }

    // 大小限制 20MB（前端已预压缩，这里做兜底；超过会被浏览器端拦截的更小提示引导）
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: `图片不能超过 20MB，当前 ${(file.size / 1024 / 1024).toFixed(1)}MB` }, { status: 400 });
    }

    // 压缩（宽度>1200 压到 1200、高度不限制；gif/svg 等自动跳过），再转 base64 data URI
    let buffer: Buffer = Buffer.from(await file.arrayBuffer());
    let mimeType: string = file.type || 'image/jpeg';
    const compressed = await compressImageBuffer(buffer, mimeType);
    buffer = compressed.buffer;
    mimeType = compressed.mime;
    const base64 = buffer.toString('base64');
    const dataUri = `data:${mimeType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      data: {
        url: dataUri,
        originalName: file.name,
        size: buffer.length,
        type: mimeType,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || '上传失败' }, { status: 500 });
  }
}
