/**
 * Import scraped Toutiao articles into the website database
 */
const fs = require('fs');

const results = JSON.parse(fs.readFileSync('toutiao_results.json', 'utf-8'));

// Category guessing
const CATEGORY_KEYWORDS = {
  "ai-llm": ["AI", "大模型", "人工智能", "GPT", "LLM", "豆包", "Kimi", "OpenAI", "ChatGPT", "DeepSeek", "可灵", "Sora", "视频生成", "Agent", "智能体", "智谱", "深度求索"],
  "embodied-ai": ["机器人", "具身智能", "人形", "Figure", "宇树", "优必选"],
  "ai-hardware": ["芯片", "GPU", "算力", "硬件", "AI手机"],
  "ai-applications": ["应用", "AI搜索", "Cursor", "Copilot", "Perplexity", "订阅", "收费", "商业化"],
  "mobile-digital": ["手机", "苹果", "华为", "小米", "iPhone", "数码"],
  "retail-ecommerce": ["电商", "零售", "抖音", "快手", "拼多多", "京东", "淘宝", "美团", "直播", "消费", "广告"],
  "ip-gaming": ["游戏", "IP", "黑神话", "原神", "米哈游", "电竞"],
};

function guessCategory(title, content) {
  const text = title + " " + (content || "");
  let best = "ai-llm", bestScore = 0;
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = slug; }
  }
  return best;
}

function cleanArticleContent(html) {
  // Remove h1 and article-meta from scraped content
  return html
    .replace(/<h1>[^<]*<\/h1>/, '')
    .replace(/<div class="article-meta">[\s\S]*?<\/div>/, '')
    .replace(/<article class="[^"]*">/, '')
    .replace(/<\/article>$/, '')
    .replace(/data-src="/g, 'src="')  // Fix lazy-loaded images
    .replace(/data:image\/gif;base64,[^"]+/g, '')  // Remove placeholders
    .trim();
}

function extractCover(html) {
  const m = html.match(/src="(https:\/\/[^"]+\.(jpg|png|jpeg|webp)[^"]*)"/i);
  return m ? m[1] : '';
}

function extractTime(str) {
  const m = str?.match(/(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2})/);
  return m ? m[1] : new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function extractTitle(fullHtml) {
  const m = fullHtml.match(/<h1>([^<]*)<\/h1>/);
  return m ? m[1] : '';
}

// Process successful articles
const articles = results
  .filter(r => r.content && r.content.length > 500 && !r.content.includes('web-login'))
  .map(r => {
    const title = extractTitle(r.content) || r.title;
    const cleaned = cleanArticleContent(r.content);
    const cover = r.cover?.startsWith('http') ? r.cover : extractCover(cleaned);
    const time = extractTime(r.content);
    const category = guessCategory(title, cleaned);
    return { title, content: cleaned, cover, time, category, author: '奇点研究社' };
  });

fs.writeFileSync('articles_to_import.json', JSON.stringify(articles, null, 2));
console.log(`Prepared ${articles.length} articles for import:`);
articles.forEach(a => {
  console.log(`  [${a.category}] ${a.title}`);
  console.log(`    Cover: ${a.cover?.substring(0, 60)}`);
  console.log(`    Time: ${a.time}`);
});
