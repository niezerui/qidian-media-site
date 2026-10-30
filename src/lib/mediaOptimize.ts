/**
 * 正文媒体优化（服务端）
 *
 * 规则：
 *   1. base64 data URI 图片 → 用 sharp 压缩（宽 ≤1200）
 *   2. 压缩后仍然较大（> INLINE_MAX）→ 上传对象存储，正文改存公开 URL
 *      （避免 base64 膨胀 ~1.33 倍后撑爆 DB 单行 / 保存请求体 / 响应体）
 *   3. 小图继续内嵌 base64，正文保持自包含（不依赖外部存储）
 *
 * 用于「文件导入」等会产生大量内嵌图的场景。
 */
import { compressImageBuffer, parseDataUri } from './serverImage';
import { putBufferToBlob, safePathname } from './blob';

/** 压缩后 ≤ 该体积的图片继续内嵌 base64 */
const INLINE_MAX_BYTES = 480_000;
/** 单篇最多外置处理的图片数（防超时） */
const MAX_IMAGES = 40;

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export async function optimizeContentImages(html: string, prefix = 'article'): Promise<string> {
  if (!html) return html;

  const uris = Array.from(
    new Set(Array.from(html.matchAll(/src\s*=\s*["'](data:image\/[^"']+)["']/gi)).map(m => m[1]))
  );
  if (uris.length === 0) return html;

  let out = html;
  for (const uri of uris.slice(0, MAX_IMAGES)) {
    const parsed = parseDataUri(uri);
    if (!parsed) continue;

    let buffer = parsed.buffer;
    let mime = parsed.mime;
    try {
      const compressed = await compressImageBuffer(buffer, mime);
      buffer = compressed.buffer;
      mime = compressed.mime;
    } catch {
      /* 压缩失败则用原图继续判断 */
    }

    if (buffer.length <= INLINE_MAX_BYTES) {
      // 小图：仅在被压缩后替换，保持内嵌
      if (buffer !== parsed.buffer) {
        out = out.split(uri).join(`data:${mime};base64,${buffer.toString('base64')}`);
      }
      continue;
    }

    // 大图：外置到对象存储
    const ext = EXT_BY_MIME[mime] || 'jpg';
    const url = await putBufferToBlob(buffer, safePathname(prefix, `image.${ext}`), mime);
    if (url) out = out.split(uri).join(url);
  }

  return out;
}
