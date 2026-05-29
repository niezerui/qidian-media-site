import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string || 'image';

    if (!file) {
      return NextResponse.json({ success: false, error: '没有上传文件' }, { status: 400 });
    }

    // Validate file type
    if (type === 'image' && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '不支持的图片格式，支持 JPG/PNG/GIF/WebP/SVG' },
        { status: 400 }
      );
    }

    if (type === 'video' && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '不支持的视频格式，支持 MP4/WebM/OGG' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: '文件过大，最大支持100MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = path.extname(file.name) || (type === 'image' ? '.jpg' : '.mp4');
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    const subDir = type === 'video' ? 'videos' : 'images';
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', subDir);

    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, uniqueName);

    await writeFile(filePath, buffer);

    const url = `/uploads/${subDir}/${uniqueName}`;

    return NextResponse.json({
      success: true,
      data: {
        url,
        filename: uniqueName,
        originalName: file.name,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
