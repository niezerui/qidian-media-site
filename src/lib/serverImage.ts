/**
 * 服务端图片压缩工具（sharp）
 *
 * 背景：Vercel Serverless 单次请求体上限约 4.5MB。正文图片以 base64 data URI
 * 内嵌存储/传输时体积膨胀 ~1.33 倍，大图会直接导致「发布失败 / 上传失败」。
 * 因此在上传与文件导入链路入库前统一压缩：
 *   - 宽度 > 1200px 缩放到宽度 1200（高度不限制，等比自适应；长截图/竖图仅压宽）
 *   - JPEG → JPEG(渐进质量，目标 ≤ ~1.2MB)；PNG → WebP(保留透明，体积小)；WebP 原样压缩
 *   - 动图(GIF)/SVG/AVIF 跳过，避免破坏动画/矢量
 *   - 小于阈值的小图直接放行（避免无谓质量损失与 CPU 开销）
 */
import sharp from 'sharp';

const MAX_WIDTH = 1200;
const TARGET_MAX_BYTES = 1_200_000; // 压缩后单张目标 ≤ ~1.2MB
const SKIP_BYTES = 350_000;          // 原图 ≤ 350KB 不做处理
const MAX_IMAGES_PER_CONTENT = 24;   // 单篇正文最多处理的图片数（防慢）

export function parseDataUri(uri: string): { mime: string; buffer: Buffer } | null {
  const m = uri.match(/^data:([^;,]+);base64,(.+)$/i);
  if (!m) return null;
  try {
    return { mime: m[1].toLowerCase(), buffer: Buffer.from(m[2], 'base64') };
  } catch {
    return null;
  }
}

/**
 * 压缩图片 Buffer，返回 { buffer, mime }（格式可能变为 webp/jpeg）
 */
export async function compressImageBuffer(
  buffer: Buffer,
  mime: string
): Promise<{ buffer: Buffer; mime: string }> {
  if (!buffer || buffer.length === 0) return { buffer, mime };
  const isRaster = ['image/jpeg', 'image/png', 'image/webp'].includes(mime);
  if (!isRaster) return { buffer, mime }; // gif/svg/avif 等跳过
  if (buffer.length <= SKIP_BYTES) return { buffer, mime }; // 小图放行

  try {
    const meta = await sharp(buffer, { animated: mime === 'image/gif' }).metadata();
    if (!meta.width) return { buffer, mime };

    let pipeline = sharp(buffer).rotate(); // 依据 EXIF 自动摆正

    // 只限制宽度：宽 > 1200 时按比例缩到 1200，高度不裁切不封顶（fit:'inside' 保证等比不变形）
    if ((meta.width || 0) > MAX_WIDTH) {
      pipeline = pipeline.resize({
        width: MAX_WIDTH,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // PNG → WebP（保留透明通道，体积远小于 PNG）
    if (mime === 'image/png') {
      const out = await pipeline.clone().webp({ quality: 82 }).toBuffer();
      return { buffer: out, mime: 'image/webp' };
    }

    // JPEG → 渐进质量，确保 ≤ 目标体积
    if (mime === 'image/jpeg') {
      for (const q of [82, 70, 55]) {
        const out = await pipeline.clone().jpeg({ quality: q }).toBuffer();
        if (out.length <= TARGET_MAX_BYTES) return { buffer: out, mime: 'image/jpeg' };
      }
      const last = await pipeline.clone().jpeg({ quality: 50 }).toBuffer();
      return { buffer: last, mime: 'image/jpeg' };
    }

    // WebP 等其它光栅
    const out = await pipeline.clone().webp({ quality: 80 }).toBuffer();
    return { buffer: out, mime };
  } catch {
    return { buffer, mime }; // 压缩失败则原样返回
  }
}

/** data URI → 压缩后的 data URI（可能更换 mime） */
export async function compressDataUri(uri: string): Promise<string> {
  const parsed = parseDataUri(uri);
  if (!parsed) return uri;
  const { buffer, mime } = await compressImageBuffer(parsed.buffer, parsed.mime);
  if (buffer === parsed.buffer) return uri; // 未改动
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * 扫描正文 HTML 中所有 data:image URI 并压缩（用于 HTML 文件导入 / 兜底）
 * 只处理体积较大的图片，控制处理数量
 */
export async function compressHtmlDataUris(html: string): Promise<string> {
  if (!html) return html;
  const uris = Array.from(html.matchAll(/src\s*=\s*["'](data:image\/[^"']+)["']/gi)).map(m => m[1]);
  if (uris.length === 0) return html;

  const toProcess = uris.filter(u => u.length > SKIP_BYTES * 1.4).slice(0, MAX_IMAGES_PER_CONTENT);
  if (toProcess.length === 0) return html;

  let result = html;
  for (const uri of toProcess) {
    const compressed = await compressDataUri(uri);
    if (compressed !== uri) {
      // 值可能含 base64 中无特殊字符，直接 replace 安全
      result = result.split(uri).join(compressed);
    }
  }
  return result;
}
