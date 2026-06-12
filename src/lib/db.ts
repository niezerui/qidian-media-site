import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables');
    }

    // Vercel Serverless 不支持 libsql:// WebSocket 协议，必须用 https://
    const httpUrl = url.replace('libsql://', 'https://');

    client = createClient({ url: httpUrl, authToken });
  }
  return client;
}

// Run once on first request to ensure tables exist (with concurrency lock)
export async function ensureInit(): Promise<void> {
  if (initialized) return;
  if (initPromise) { await initPromise; return; }

  initPromise = (async () => {
    const db = getDb();
  // 逐条执行建表（HTTP模式不支持executeMultiple）
  const tables = [
    `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, summary TEXT DEFAULT '', content TEXT DEFAULT '', cover_image TEXT, category_id INTEGER NOT NULL, author TEXT DEFAULT '奇点编辑部', tags TEXT DEFAULT '[]', is_featured INTEGER DEFAULT 0, is_exclusive INTEGER DEFAULT 0, is_banner INTEGER DEFAULT 0, view_count INTEGER DEFAULT 0, published_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (category_id) REFERENCES categories(id))`,
    `CREATE TABLE IF NOT EXISTS flash_news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT DEFAULT '', date_label TEXT DEFAULT '', published_at DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS admin_users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`,
  ];

  for (const sql of tables) {
    await db.execute(sql);
  }

  // Migrate: add is_banner column if missing
  try { await db.execute(`ALTER TABLE articles ADD COLUMN is_banner INTEGER DEFAULT 0`); } catch {}
  // Migrate: add status column (published/draft)
  try { await db.execute(`ALTER TABLE articles ADD COLUMN status TEXT DEFAULT 'published'`); } catch {}

  // Migrate: add wechat_config table
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS wechat_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      app_id TEXT NOT NULL,
      app_secret TEXT NOT NULL,
      access_token TEXT,
      token_expires_at INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  } catch {}

  // Indexes (may fail if already exist, safe to retry)
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at)`,
    `CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(is_featured)`,
    `CREATE INDEX IF NOT EXISTS idx_flash_news_published ON flash_news(published_at)`,
  ];

  for (const sql of indexes) {
    try { await db.execute(sql); } catch {}
  }

  // Seed default categories (INSERT OR IGNORE)
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

  for (const [slug, name, description] of categories) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO categories (slug, name, description) VALUES (?, ?, ?)',
      args: [slug, name, description],
    });
  }

  // Seed default admin
  const existing = await db.execute({
    sql: 'SELECT id FROM admin_users WHERE username = ?',
    args: ['admin'],
  });

  if (existing.rows.length === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    await db.execute({
      sql: 'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
      args: ['admin', hash],
    });
  }

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
