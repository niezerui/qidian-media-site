const puppeteer = require('puppeteer');

const URLS = [
  'https://www.toutiao.com/article/7639205795334193715/',
  'https://www.toutiao.com/article/7636970316291506740/',
  'https://www.toutiao.com/article/7634371572660306484/',
  'https://www.toutiao.com/article/7633995580515041826/',
];

async function scrapeArticle(browser, url) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('article, .article-content, [class*="article"]', { timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    const data = await page.evaluate(() => {
      const title = document.querySelector('h1')?.textContent?.trim() || document.title;
      const article = document.querySelector('article, .article-content, [class*="article-body"]');
      const content = article ? article.innerHTML : '';
      const cover = document.querySelector('article img, .article-content img, [class*="cover"] img')?.src || '';
      const timeEl = document.querySelector('time, [class*="time"], [class*="date"], [class*="publish"]');
      const time = timeEl?.textContent?.trim() || timeEl?.getAttribute('datetime') || '';
      const author = document.querySelector('[class*="author"], [class*="name"]')?.textContent?.trim() || '';
      const tags = Array.from(document.querySelectorAll('[class*="tag"], [class*="keyword"]')).map(el => el.textContent.trim()).filter(Boolean);
      return { title, content, cover, time, author, tags };
    });

    await page.close();
    return data;
  } catch (e) {
    console.error(`Error:`, e.message);
    await page.close();
    return null;
  }
}

async function main() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox'],
  });

  const results = [];
  for (const url of URLS) {
    console.log(`Scraping: ${url.split('/').pop()}`);
    const data = await scrapeArticle(browser, url);
    if (data) {
      console.log(`  Title: ${data.title?.substring(0, 80)}`);
      results.push(data);
    }
  }

  require('fs').writeFileSync('toutiao_results.json', JSON.stringify(results, null, 2));
  console.log(`\nDone. ${results.length} articles.`);
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
