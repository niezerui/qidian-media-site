/**
 * 客户端图片预压缩（canvas）
 *
 * 用途：图片在 <img> 上传/粘贴到富文本编辑器时，先在浏览器端缩放压缩，
 * 再把压缩后的小文件发给服务端 —— 避免原图过大导致：
 *   1) Vercel 4.5MB 请求体上限拦截（413 → 「上传失败/发布失败」）
 *   2) base64 正文体积失控
 *
 * 规则：GIF/SVG 等跳过（保动画/矢量）；小图（<300KB 且宽≤1200）放行。
 * 宽度 > 1200 的图仅缩宽到 1200，高度不限制（等比，不裁切）。
 * 输出格式：JPEG→JPEG；PNG/其它→优先 WebP（支持透明），不支持则 PNG/JPEG。
 */

const MAX_WIDTH = 1200;
const TARGET_MAX_BYTES = 1_050_000; // 客户端压缩目标 ≤ ~1MB
const SKIP_BYTES = 300_000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片解码失败'));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * 压缩图片文件，返回可直接上传的新 File；无需处理时返回原 File
 */
export async function compressImageFile(file: File): Promise<File> {
  const type = file.type || 'image/jpeg';
  if (!type.startsWith('image/')) return file;
  // 动图/矢量/低损格式跳过
  if (['image/gif', 'image/svg+xml', 'image/avif'].includes(type)) return file;

  // 小图放行
  if (file.size > 0 && file.size <= SKIP_BYTES) return file;

  try {
    const objectUrl = URL.createObjectURL(file);
    const img = await loadImage(objectUrl);
    URL.revokeObjectURL(objectUrl);

    const w = img.naturalWidth || 0;
    const h = img.naturalHeight || 0;
    if (!w || !h) return file;
    if (file.size <= SKIP_BYTES || (w <= MAX_WIDTH && file.size <= TARGET_MAX_BYTES)) return file;

    // 缩放比例：仅当宽度 > 1200 时压宽（等比缩放高度自适应，不限制高度、不裁切、不放大）
    const scale = Math.min(1, MAX_WIDTH / w);
    const targetW = Math.max(1, Math.round(w * scale));
    const targetH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // 选输出格式：JPEG 保持；PNG 优先 WebP（保留透明）；其它按原格式
    let outType = type;
    if (type === 'image/jpeg') {
      ctx.fillStyle = '#ffffff'; // JPEG 无透明，白底
      ctx.fillRect(0, 0, targetW, targetH);
    } else if (type === 'image/png') {
      outType = 'image/webp'; // 支持透明；若 toBlob 不支持会走下方回退
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // 渐进质量循环
    const qualities = [0.85, 0.72, 0.6];
    let best: Blob | null = null;
    for (const q of qualities) {
      best = await canvasToBlob(canvas, outType, q);
      if (best && best.size <= TARGET_MAX_BYTES) break;
    }
    // WebP 不可用（老浏览器）→ 降级 PNG/JPEG
    if (!best && outType === 'image/webp') {
      const png = await canvasToBlob(canvas, 'image/png', 0.9);
      if (png) best = png;
    }
    if (!best) return file;

    // 压缩后反而更大则保留原图
    if (best.size >= file.size) return file;

    const name = file.name && file.name.includes('.') ? file.name.replace(/\.[^.]+$/, '') : 'image';
    const ext = outType === 'image/png' ? 'png' : outType === 'image/webp' ? 'webp' : 'jpg';
    const result = new File([best], `${name}.${ext}`, { type: outType });
    return result.size < file.size ? result : file;
  } catch {
    return file; // 压缩失败时原样上传（服务端仍有 sharp 兜底）
  }
}
