#!/usr/bin/env node
/**
 * 快讯自动抓取脚本
 * 从中文科技媒体RSS源抓取最新资讯，过滤后批量推送到网站API
 *
 * 用法: node scripts/auto-flash.mjs
 * 环境变量:
 *   SITE_URL  - 网站地址 (默认 https://qidianyanjiushe.com)
 *   API_KEY   - 自动导入API密钥 (默认 qidian-flash-auto-2026-secure)
 */

const SITE_URL = process.env.SITE_URL || 'https://qidianyanjiushe.com';
const API_KEY = process.env.API_KEY || 'qidian-flash-auto-2026-secure';
const IMPORT_API = `${SITE_URL}/api/admin/flashes/auto-import`;
const MAX_PUSH = 80;        // 每次最多推送 80 条
const RECENT_DAYS = 7;      // 只推送最近 7 天的条目（滚动窗口，保证轮播有 50+ 条）

// ===== RSS 源配置（仅中文源，2026-10-12 扩充以支撑 50 条轮播池） =====
// 已剔除：36氪（feed 返回 HTML）、机器之心（返回 HTML）、品玩（返回 HTML）、
//         TechWeb（500）、虎嗅（超时，偶发）；雷锋网保留但常超时，失败不影响其它源
const RSS_SOURCES = [
  { name: '爱范儿', url: 'https://www.ifanr.com/feed', lang: 'zh', maxItems: 20 },
  { name: '钛媒体', url: 'https://www.tmtpost.com/feed', lang: 'zh', maxItems: 20 },
  { name: 'IT之家', url: 'https://www.ithome.com/rss/', lang: 'zh', maxItems: 60 },
  { name: '快科技', url: 'https://rss.mydrivers.com/rss.aspx', lang: 'zh', maxItems: 60 },
  { name: '极客公园', url: 'https://www.geekpark.net/rss', lang: 'zh', maxItems: 30 },
  { name: '量子位', url: 'https://www.qbitai.com/feed', lang: 'zh', maxItems: 15 },
  { name: '新浪科技', url: 'http://rss.sina.com.cn/tech/rollnews.xml', lang: 'zh', maxItems: 15 },
  { name: '少数派', url: 'https://sspai.com/feed', lang: 'zh', maxItems: 10 },
  { name: '雷锋网', url: 'https://www.leiphone.com/feed', lang: 'zh', maxItems: 20 },
];

// ===== 关键词过滤 =====
const KEYWORDS_ZH = [
  'AI', '人工智能', '大模型', '大语言模型', 'GPT', 'ChatGPT', 'OpenAI',
  '机器人', '具身智能', '人形机器人', '四足机器人',
  '芯片', 'GPU', '算力', '英伟达', '半导体',
  '融资', '投资', '并购', '估值', '独角兽',
  '特斯拉', '比亚迪', '蔚来', '小鹏', '理想',
  '电商', '零售', '直播带货', '供应链',
  '手机', '数码', '苹果', '华为', '小米', 'OPPO', 'vivo',
  '游戏', 'IP', '元宇宙', 'VR', 'AR',
  '自动驾驶', '智能驾驶', '新能源', '电动车',
  '字节跳动', '腾讯', '阿里', '百度', '美团', '京东', '拼多多',
  'Figure', '宇树', '智元', '优必选', '越疆',
  '无人机', '低空经济',
];

// ===== 工具函数 =====
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .trim();
}

function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function matchKeywords(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  return KEYWORDS_ZH.some(kw => text.includes(kw.toLowerCase()));
}

// ===== RSS 解析 =====
function parseRss(xml, sourceName, maxItems) {
  const items = [];

  const itemRegex = /<(?:item|entry)[\s\S]*?<\/(?:item|entry)>/gi;
  const matches = xml.match(itemRegex) || [];

  for (const block of matches.slice(0, maxItems * 3)) {
    const title = decodeXmlEntities(
      (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()
    );
    if (!title) continue;

    const link = decodeXmlEntities(
      (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || '').trim()
    ) || (block.match(/<link[^>]*href="([^"]*)"/i)?.[1] || '').trim() || '';

    const description = stripHtml(
      decodeXmlEntities(
        (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] || '').trim()
      )
    );

    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim()
      || block.match(/<published[^>]*>([\s\S]*?)<\/published>/i)?.[1]?.trim()
      || '';

    // 快讯摘要截断到 100 字：全文 RSS 会把正文文章整段塞进来，快讯只保留一句话摘要
    const summary = description.slice(0, 100) + (description.length > 100 ? '…' : '');

    items.push({
      title,
      content: summary,
      source: sourceName,
      source_url: link,
      published_at: parseDate(pubDate),
    });
  }

  return items;
}

// ===== 抓取单个RSS源 =====
async function fetchRss(source) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`  [${source.name}] HTTP ${res.status}`);
      return [];
    }

    const xml = await res.text();
    const items = parseRss(xml, source.name, source.maxItems);

    const filtered = items.filter(item =>
      // 标题必须含中文（防止 RSS 混入英文条目）且命中关键词
      /[\u4e00-\u9fff]/.test(item.title) && matchKeywords(item.title, item.content)
    );

    const enCount = items.filter(i => !/[\u4e00-\u9fff]/.test(i.title)).length;
    console.log(`  [${source.name}] 抓取 ${items.length} 条, 过滤英文 ${enCount} 条, 关键词过滤后 ${filtered.length} 条`);
    return filtered;
  } catch (e) {
    console.error(`  [${source.name}] 抓取失败: ${e.message}`);
    return [];
  }
}

// ===== 批量推送 =====
async function pushToApi(items) {
  if (items.length === 0) {
    console.log('\n没有需要推送的快讯');
    return;
  }

  console.log(`\n正在推送 ${items.length} 条快讯到 ${IMPORT_API} ...`);

  try {
    const res = await fetch(IMPORT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auto-import-key': API_KEY,
      },
      body: JSON.stringify({ items }),
    });

    const data = await res.json();

    if (data.success) {
      console.log(`\n===== 推送结果 =====`);
      console.log(`  新增: ${data.inserted} 条`);
      console.log(`  重复: ${data.duplicated} 条`);
      if (data.errors && data.errors.length > 0) {
        console.log(`  错误: ${data.errors.length} 条`);
        data.errors.forEach(e => console.log(`    - ${e}`));
      }
    } else {
      console.error(`推送失败: ${data.error}`);
    }
  } catch (e) {
    console.error(`推送异常: ${e.message}`);
  }
}

// ===== 主流程 =====
// 只推送最近 RECENT_DAYS 天内的条目（北京时间）；比“仅当日”更稳，
// 避免凌晨或某个源当天没更新时快讯池只剩个位数
function isWithinRecentDays(iso, days) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return false;
  const cutoff = Date.now() + 8 * 3600 * 1000 - days * 24 * 3600 * 1000;
  return t + 8 * 3600 * 1000 >= cutoff;
}

// 按标题去重（不同源可能转发同一条新闻）
function dedupeByTitle(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = it.title.replace(/\s+/g, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

async function main() {
  console.log('=====================================');
  console.log('  24小时快讯自动抓取');
  console.log('  ' + new Date().toLocaleString('zh-CN'));
  console.log('=====================================\n');

  console.log(`目标站点: ${SITE_URL}`);
  console.log(`RSS源数量: ${RSS_SOURCES.length}（仅中文源）`);
  console.log(`时间窗口: 最近 ${RECENT_DAYS} 天　单次最多推送: ${MAX_PUSH} 条\n`);

  // 并行抓取所有源
  console.log('开始抓取...\n');
  const results = await Promise.allSettled(
    RSS_SOURCES.map(src => fetchRss(src))
  );

  // 汇总所有快讯
  const allItems = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }

  // 时间窗口过滤 → 标题去重 → 按时间倒序
  const recentItems = allItems.filter(item => isWithinRecentDays(item.published_at, RECENT_DAYS));
  const uniqueItems = dedupeByTitle(recentItems);
  uniqueItems.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  // 限制总数
  const itemsToPush = uniqueItems.slice(0, MAX_PUSH);

  console.log(`\n总计: ${allItems.length} 条, 窗口内 ${recentItems.length} 条, 去重后 ${uniqueItems.length} 条, 推送 ${itemsToPush.length} 条`);

  // 推送
  await pushToApi(itemsToPush);

  console.log('\n=====================================');
  console.log('  抓取完成');
  console.log('=====================================');
}

main().catch(e => {
  console.error('运行异常:', e);
  process.exit(1);
});
