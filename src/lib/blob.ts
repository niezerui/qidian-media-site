/**
 * Vercel Blob 对象存储工具（服务端）
 *
 * 为什么需要它：
 *   Vercel Serverless 单次请求体上限约 4.5MB。图片可以靠压缩后 base64 内嵌绕过，
 *   但视频（MP4/MOV）、大体积动图（GIF）、以及 >4MB 的文档（Word 等）根本无法压缩，
 *   存进数据库也会让单行体积失控。因此这类媒体统一走对象存储：
 *     - 客户端直传：@vercel/blob/client 的 upload()，浏览器 → Blob 直传，
 *       完全绕过函数请求体限制（授权接口见 /api/admin/upload/blob）
 *     - 服务端上传：putBufferToBlob()，用于导入解析后需要外置的图片
 *   入库时只在正文里保存公开 URL（https），不再膨胀数据库与保存请求体。
 */
import { put } from '@vercel/blob';

/** Blob 公网地址后缀（用于识别站内对象存储地址） */
const BLOB_HOST_RE = /^https?:\/\/[^/]*\.blob\.vercel-storage\.com\//i;

export function isBlobUrl(url: string): boolean {
  return BLOB_HOST_RE.test(url);
}

/** 是否已配置 Blob（缺 token 时调用方需降级为 base64 内嵌） */
export function hasBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * 服务端上传 Buffer → Blob，返回公开 URL；失败返回 null（调用方自行降级）
 */
export async function putBufferToBlob(
  buffer: Buffer,
  pathname: string,
  contentType: string
): Promise<string | null> {
  if (!hasBlobStorage()) return null;
  try {
    const res = await put(pathname, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return res.url;
  } catch (e: any) {
    console.error('[blob] put 失败:', e?.message || e);
    return null;
  }
}

/** 生成安全的存储路径（去掉中文/特殊字符，保留扩展名） */
export function safePathname(prefix: string, name: string): string {
  const ext = (name.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
  const base = (name.replace(/\.[^.]+$/, '') || 'file')
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'file';
  const stamp = Date.now().toString(36);
  return `${prefix}/${stamp}-${base}${ext ? `.${ext}` : ''}`;
}
