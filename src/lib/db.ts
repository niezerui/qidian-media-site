import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error('Missing TURSO_DATABASE_URL environment variable');
    }

    // 自托管部署：TURSO_DATABASE_URL 指向本地 SQLite（file: 协议），无需鉴权 token。
    // 走 file: 时不需要 token，也不做 libsql:// → https:// 替换。
    const isLocalFile = url.startsWith('file:');

    if (!isLocalFile && !authToken) {
      throw new Error('Missing TURSO_AUTH_TOKEN environment variable');
    }

    // Vercel Serverless 不支持 libsql:// WebSocket 协议，必须用 https://
    const httpUrl = isLocalFile ? url : url.replace('libsql://', 'https://');

    client = createClient({
      url: httpUrl,
      ...(isLocalFile ? {} : { authToken }),
    });
  }
  return client;
}

// Run once on first request to ensure tables exist (with concurrency lock)
export async function ensureInit(): Promise<void> {
  if (initialized) return;
  if (initPromise) { await initPromise; return; }

  initPromise = (async () => {
    const db = getDb();

    // 自托管（本地 SQLite）场景：表结构已由迁移脚本建好，无需每次启动跑 DDL。
    // 反复执行 CREATE TABLE IF NOT EXISTS 会触发写锁，与并发读请求争抢。
    // 仅在表确实缺失时才初始化。
    if (process.env.TURSO_DATABASE_URL?.startsWith('file:')) {
      try {
        const check = await db.execute(
          `SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name IN ('categories','articles','flash_news','admin_users')`
        );
        if (Number(check.rows[0]?.c || 0) >= 4) {
          initialized = true;
          initPromise = null;
          return;
        }
      } catch {
        // 检测失败则继续走完整初始化流程
      }
    }

    // 说明：Vercel serverless 冷启动时每条 DDL 都是一次跨洋 HTTP 往返。
    // 原实现 40+ 条串行执行会耗时数十秒拖垮首屏，现改为并行波次：
    //   P1 基础表 → P2 迁移/索引（彼此独立，均 try 容错）→ P3 种子数据
    const ignoreErr = (p: Promise<any>) => p.catch(() => {});

    // P1: 基础表（无依赖，可并行）
    const tables = [
      `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT DEFAULT '', sort_order INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, summary TEXT DEFAULT '', content TEXT DEFAULT '', cover_image TEXT, category_id INTEGER NOT NULL, author TEXT DEFAULT '奇点编辑部', tags TEXT DEFAULT '[]', is_featured INTEGER DEFAULT 0, is_exclusive INTEGER DEFAULT 0, is_banner INTEGER DEFAULT 0, view_count INTEGER DEFAULT 0, published_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES categories(id))`,
      `CREATE TABLE IF NOT EXISTS flash_news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT DEFAULT '', date_label TEXT DEFAULT '', published_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS admin_users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    ];
    await Promise.all(tables.map(t => ignoreErr(db.execute(t))));

    // P2: 迁移列 + 辅助表 + 索引（全部独立容错，可并行）
    const migrates = [
      `ALTER TABLE articles ADD COLUMN is_banner INTEGER DEFAULT 0`,
      `ALTER TABLE articles ADD COLUMN status TEXT DEFAULT 'published'`,
      // 导航排序字段（后台「分类管理」可上移/下移，前台按此渲染）
      `ALTER TABLE categories ADD COLUMN sort_order INTEGER`,
      `ALTER TABLE flash_news ADD COLUMN source TEXT DEFAULT ''`,
      `ALTER TABLE flash_news ADD COLUMN source_url TEXT DEFAULT ''`,
      `ALTER TABLE flash_news ADD COLUMN is_auto INTEGER DEFAULT 0`,
      `CREATE INDEX IF NOT EXISTS idx_flash_news_source_url ON flash_news(source_url)`,
      `CREATE TABLE IF NOT EXISTS wechat_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        app_id TEXT NOT NULL,
        app_secret TEXT NOT NULL,
        access_token TEXT,
        token_expires_at INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        parent_id INTEGER DEFAULT NULL,
        author_name TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'approved',
        ip TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at)`,
      `CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(is_featured)`,
      `CREATE INDEX IF NOT EXISTS idx_flash_news_published ON flash_news(published_at)`,
    ];
    await Promise.all(migrates.map(sql => ignoreErr(db.execute(sql))));

    // P3: 种子数据（依赖表已存在，可并行）
    const categories = [
      ['24h-news', '24小时快讯', '最新最快的行业资讯'],
      ['retail-ecommerce', '零售电商', '零售与电商行业动态'],
      ['mobile-digital', '手机数码', '手机与数码产品资讯'],
      ['ai-llm', 'AI大模型', '大语言模型与AI基础设施'],
      ['embodied-ai', '具身智能', '机器人与具身智能'],
      ['ai-hardware', 'AI硬件', 'AI芯片与智能硬件'],
      ['ai-applications', 'AI应用', 'AI应用与产品落地'],
      ['ip-gaming', 'IP游戏', '游戏与IP产业动态'],
    ];
    await Promise.all(categories.map(([slug, name, description]) =>
      ignoreErr(db.execute({ sql: 'INSERT OR IGNORE INTO categories (slug, name, description) VALUES (?, ?, ?)', args: [slug, name, description] }))
    ));

    // 排序回填：仅对从未排过序（sort_order IS NULL）的分类按 id 赋初值。
    // 用户一旦在后台调过顺序，sort_order 即为具体数字，不会被再次覆盖。
    await ignoreErr(db.execute('UPDATE categories SET sort_order = id WHERE sort_order IS NULL'));

    // 默认管理员（需读后写，单独处理）
    try {
      const existing = await db.execute({ sql: 'SELECT id FROM admin_users WHERE username = ?', args: ['admin'] });
      if (existing.rows.length === 0) {
        const bcrypt = require('bcryptjs');
        const hash = bcrypt.hashSync('admin123', 10);
        await db.execute({ sql: 'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)', args: ['admin', hash] });
      }
    } catch {}

    initialized = true;
    initPromise = null;
  })();

  await initPromise;
}

// Helper: execute a query and return rows
export async function query(sql: string, args: any[] = []): Promise<any[]> {
  await ensureInit();
  const db = getDb();
  const result = await db.execute({ sql, args });
  return result.rows;
}

// Helper: execute a query and return first row
export async function queryOne(sql: string, args: any[] = []): Promise<any | null> {
  await ensureInit();
  const db = getDb();
  const result = await db.execute({ sql, args });
  return result.rows[0] || null;
}

// Helper: execute an insert/update/delete
export async function execute(sql: string, args: any[] = []): Promise<{ lastInsertRowid: number | bigint; rowsAffected: number }> {
  await ensureInit();
  const db = getDb();
  const result = await db.execute({ sql, args });
  return {
    lastInsertRowid: result.lastInsertRowid ?? 0,
    rowsAffected: result.rowsAffected,
  };
}

// Helper: 批量写入（单次往返；用于分类排序等需要一起生效的场景）
export async function executeBatch(statements: { sql: string; args?: any[] }[]): Promise<void> {
  if (statements.length === 0) return;
  await ensureInit();
  const db = getDb();
  await db.batch(statements.map(s => ({ sql: s.sql, args: s.args ?? [] })));
}
