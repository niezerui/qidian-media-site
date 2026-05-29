import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'media.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
  }
  return db;
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      summary TEXT DEFAULT '',
      content TEXT DEFAULT '',
      cover_image TEXT,
      category_id INTEGER NOT NULL,
      author TEXT DEFAULT '奇点编辑部',
      tags TEXT DEFAULT '[]',
      is_featured INTEGER DEFAULT 0,
      is_exclusive INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS flash_news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      date_label TEXT DEFAULT '',
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id);
    CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at);
    CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(is_featured);
    CREATE INDEX IF NOT EXISTS idx_flash_news_published ON flash_news(published_at);
  `);

  // Seed default categories
  const insertCategory = db.prepare(
    'INSERT OR IGNORE INTO categories (slug, name, description) VALUES (?, ?, ?)'
  );

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

  const seedAll = db.transaction(() => {
    for (const cat of categories) {
      insertCategory.run(...cat);
    }
  });
  seedAll();

  // Seed default admin (username: admin, password: admin123)
  const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  }
}

// Close DB connection (for scripts)
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
