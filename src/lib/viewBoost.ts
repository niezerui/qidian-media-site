/**
 * 阅读量显示增强
 *
 * 目标：
 * 1. 文章「看上去」始终有热度（沉淀后普通文章不低于约 5200）。
 * 2. 新发布文章允许较低数字，符合真实传播曲线。
 * 3. 第 3 天后增长主要由真实阅读增量驱动（合成曲线已饱和）。
 * 4. 每篇文章有稳定的、幅度较大的随机扰动，数字明显错落（0.72 ~ 1.42 倍）。
 * 5. 层级区分：Banner > 主编精选 > 普通文章（同一篇文章的层级系数稳定）。
 */

interface ViewCountable {
  id?: number | string;
  slug?: string;
  published_at?: string;
  view_count?: number | string | null;
  is_banner?: boolean | number | null;
  is_featured?: boolean | number | null;
}

/** 稳定的字符串 hash（0 ~ 2^32-1） */
function stableHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 计算文章对外展示的阅读量
 *
 * 公式（d = 距发布的天数，R = 真实阅读量）：
 *   fast(d) = 5600 * (1 - e^(-d / 0.8))        // 早期快速爬升
 *   tail(d) = 180 * log2(1 + max(0, d - 2))    // 长期缓慢长尾
 *   jitter  = 0.72 ~ 1.42（按 id+slug 稳定，参差明显）
 *   tier    = banner 1.60~2.00 ｜ 精选 1.30~1.55 ｜ 普通 1.0
 *   display = floor((fast(d) + tail(d)) * jitter * tier) + R
 *
 * 结果（3 天后）：
 *   普通文章：约 5200 ~ 8300，中位 6500 上下
 *   主编精选：约 7600 ~ 13000
 *   Banner：  约 9600 ~ 17000
 *   刚发布：几十~几百（真实 R 主导）；1 天约 3000~5500（层级系数放大）
 */
export function boostViewCount(item: ViewCountable): number {
  const real = typeof item.view_count === 'number' ? item.view_count : Number(item.view_count || 0);
  const published = item.published_at ? new Date(item.published_at).getTime() : Date.now();
  const days = Math.max(0, (Date.now() - published) / (1000 * 60 * 60 * 24));

  // 稳定的文章级扰动：同页列表数字自然错落，参差明显
  const seed = String(item.id ?? '') + (item.slug ?? '');
  const hash = stableHash(seed || '0');
  const jitter = 0.72 + ((hash % 71) / 100); // 0.72 ~ 1.42

  // 层级系数：banner > 精选 > 普通（同篇文章恒定）
  const isBanner = !!item.is_banner;
  const isFeatured = !isBanner && !!item.is_featured;
  const tierHash = (hash >>> 9) % 100;
  const tierMult = isBanner
    ? 1.6 + (tierHash % 41) / 100 // 1.60 ~ 2.00
    : isFeatured
      ? 1.3 + (tierHash % 26) / 100 // 1.30 ~ 1.55
      : 1;

  // 传播曲线：前 0~2 天快速爬升，2 天后趋于饱和
  const fast = 5600 * (1 - Math.exp(-days / 0.8));
  // 长尾：老文章随时间少量自然累积
  const tail = 180 * Math.log2(1 + Math.max(0, days - 2));

  let value = Math.floor((fast + tail) * jitter * tierMult) + real;

  // 兜底：3 天以上的文章按层级保证下限，且下限本身带随机幅度（进一步拉开参差）
  if (days >= 3) {
    if (isBanner && value < 9600) {
      value = 9600 + (hash % 3400); // 9600 ~ 12999
    } else if (isFeatured && value < 7600) {
      value = 7600 + (hash % 2000); // 7600 ~ 9599（上限仍低于 Banner 下限）
    } else if (!isBanner && !isFeatured && value < 5200) {
      value = 5200 + (hash % 2800); // 5200 ~ 7999
    }
  }

  // 新发布文章如果真实阅读为 0，也显示一个较低但合理的起始值（几十~一百多）
  if (value < 80) {
    value = 60 + (hash % 80);
  }

  return value;
}

/** 阅读量格式化：>=10000 显示 x.x万 */
export function formatViews(n: number): string {
  if (n >= 10000) {
    const wan = n / 10000;
    // 保留 1 位小数，若为整数则省略 .0
    const fixed = wan.toFixed(1);
    return fixed.endsWith('.0') ? `${Math.round(wan)}万` : `${fixed}万`;
  }
  return String(n);
}
