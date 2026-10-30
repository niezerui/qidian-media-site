/**
 * 客户端 Blob 直传封装
 *
 * 浏览器 → Vercel Blob 直传（不经过我们的 API 函数），因此不受
 * Vercel Serverless 4.5MB 请求体上限约束，可上传视频等大文件。
 * 授权接口：/api/admin/upload/blob（需登录态 cookie）
 */
import { upload } from '@vercel/blob/client';

/** 演示/小文件走 base64 内嵌的体积阈值（超过则改用对象存储） */
export const INLINE_MAX_BYTES = 2_500_000;

/** 生成安全的存储路径 */
function buildPathname(prefix: string, file: File): string {
  const rawExt = (file.name.match(/\.([a-zA-Z0-9]+)$/)?.[1] || '').toLowerCase();
  const base = (file.name.replace(/\.[^.]+$/, '') || 'file')
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'file';
  const stamp = Date.now().toString(36);
  return `${prefix}/${stamp}-${base}${rawExt ? `.${rawExt}` : ''}`;
}

/**
 * 上传文件到 Blob，返回公开访问 URL
 * @param prefix 分类前缀，如 video / image / doc
 */
export async function uploadFileToBlob(
  file: File,
  prefix: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const res = await upload(buildPathname(prefix, file), file, {
    access: 'public',
    handleUploadUrl: '/api/admin/upload/blob',
    contentType: file.type || undefined,
    // 大文件启用分片并行上传（自动重试分片），显著提升视频上传稳定性
    multipart: file.size > 8 * 1024 * 1024,
    onUploadProgress: onProgress
      ? ({ percentage }) => onProgress(Math.round(percentage))
      : undefined,
  });
  return res.url;
}
