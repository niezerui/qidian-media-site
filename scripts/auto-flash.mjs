#!/usr/bin/env node
/**
 * 快讯自动抓取脚本
 * 从多个科技媒体RSS源抓取最新资讯，过滤后批量推送到网站API
 *
 * 用法: node scripts/auto-flash.mjs
 * 环境变量:
 *   SITE_URL  - 网站地址 (默认 https://qidianyanjiushe.com)
 *   API_KEY   - 自动导入API密钥 (默认 qidian-flash-auto-2026-secure)
 */

const SITE_URL = process.env.SITE_URL || 'https://qidianyanjiushe.com';
const API_KEY = process.env.API_KEY || 'qidian-flash-auto-2026-secure';
const IMPORT_API = `${SITE_URL}/api/admin/flashes/auto-import`;

// ===== RSS 源配置 =====
const RSS_SOURCES = [
  // 英文源（RSS完善）
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', lang: 'en', maxItems: 10 },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', lang: 'en', maxItems: 10 },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', lang: 'en', maxItems: 8 },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/', lang: 'en', maxItems: 8 },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', lang: 'en', maxItems: 8 },
  { name: 'IEEE Spectrum Robotics', url: 'https://spectrum.ieee.org/feeds/topic/robotics.rss', lang: 'en', maxItems: 8 },
  { name: 'The Robot Report', url: 'https://www.therobotreport.com/feed/', lang: 'en', maxItems: 8 },
  // 中文源
  { name: '36氪', url: 'https://36kr.com/feed', lang: 'zh', maxItems: 10 },
  { name: '钛媒体', url: 'https://www.tmtpost.com/feed', lang: 'zh', maxItems: 10 },
  { name: '雷锋网', url: 'https://www.leiphone.com/feed', lang: 'zh', maxItems: 10 },
];

// ===== 关键词过滤 =====
const KEYWORDS_EN = [
  'ai', 'artificial intelligence', 'robot', 'robotics', 'embodied',
  'llm', 'gpt', 'chatgpt', 'openai', 'anthropic', 'gemini', 'claude',
  'tesla', 'nvidia', 'chip', 'semiconductor', 'gpu',
  'startup', 'funding', 'series a', 'series b', 'acquisition',
  'ev', 'electric vehicle', 'autonomous', 'self-driving',
  'metaverse', 'vr', 'ar', 'xr', 'apple vision',
  'e-commerce', 'retail', 'delivery', 'supply chain',
  'figure', 'boston dynamics', 'unitree', 'agility robotics',
  'humanoid', 'drone', 'autonomous',
];

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

function matchKeywords(title, content, lang) {
  const text = (title + ' ' + content).toLowerCase();
  const keywords = lang === 'zh' ? KEYWORDS_ZH : KEYWORDS_EN;
  return keywords.some(kw => text.includes(kw.toLowerCase()));
}

// ===== RSS 解析 =====
function parseRss(xml, sourceName, lang, maxItems) {
  const items = [];

  // 匹配 <item> 或 <entry> 块
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

    // 内容摘要（截取前200字）
    const summary = description.slice(0, 300);

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
    const timeout = setTimeout(() => controller.abort(), 15000);

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
    const items = parseRss(xml, source.name, source.lang, source.maxItems);

    // 关键词过滤
    const filtered = items.filter(item =>
      matchKeywords(item.title, item.content, source.lang)
    );

    console.log(`  [${source.name}] 抓取 ${items.length} 条, 关键词过滤后 ${filtered.length} 条`);
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
async function main() {
  console.log('=====================================');
  console.log('  快讯自动抓取');
  console.log('  ' + new Date().toLocaleString('zh-CN'));
  console.log('=====================================\n');

  console.log(`目标站点: ${SITE_URL}`);
  console.log(`RSS源数量: ${RSS_SOURCES.length}\n`);

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

  // 按时间排序
  allItems.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  // 限制总数（每次最多推送50条）
  const itemsToPush = allItems.slice(0, 50);

  console.log(`\n总计: ${allItems.length} 条快讯, 推送 ${itemsToPush.length} 条`);

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
