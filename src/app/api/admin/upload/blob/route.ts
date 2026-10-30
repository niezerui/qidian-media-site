import { NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/admin/upload/blob
 * 客户端直传授权接口（@vercel/blob/client 的 upload() 会调用这里换取临时令牌）
 *
 * 浏览器 → Blob 直传，绕过 Vercel Serverless 4.5MB 请求体上限，
 * 因此可支持视频（MP4/MOV/WebM）、大体积动图以及大文档（Word 等）。
 */

/** 允许上传到 Blob 的类型 */
const ALLOWED_CONTENT_TYPES = [
  // 图片（含动图）
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml',
  // 视频
  'video/mp4', 'video/quicktime', 'video/webm', 'video/ogg', 'video/x-m4v', 'video/x-msvideo',
  // 文档（大文件导入中转）
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/markdown', 'text/plain', 'text/html',
  // 部分浏览器对 .md/.mov 等会给出 octet-stream
  'application/octet-stream',
];

const MAX_SIZE = 300 * 1024 * 1024; // 单文件上限 300MB（足够覆盖常见视频）

export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }

  try {
    await requireAuth();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_CONTENT_TYPES,
        maximumSizeInBytes: MAX_SIZE,
        addRandomSuffix: true,
      }),
      // 不注册 onUploadCompleted：本地开发时 Vercel 无法回调 localhost，
      // 省略回调可避免开发环境报错；前端上传完成后直接拿到 blob.url。
    });

    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || '上传授权失败' }, { status: 400 });
  }
}
