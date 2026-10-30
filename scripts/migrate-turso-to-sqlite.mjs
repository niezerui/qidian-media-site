#!/usr/bin/env node
/**
 * ============================================================
 * 奇点研习社 · 数据迁移：Turso(东京) → 本地 SQLite
 *
 * 为什么用 SQLite 而不是 MySQL：
 *   站点全部 SQL 都是 SQLite 方言（INSERT OR IGNORE / AUTOINCREMENT /
 *   db.batch / lastInsertRowid），@libsql/client 原生支持 file: 协议。
 *   换成 MySQL 需要重写所有 SQL —— 风险高、回归面大。
 *   数据量仅 73 篇文章 + 400 条快讯，SQLite 完全扛得住。
 *   → 迁移 = 改一个环境变量，零代码改动。
 *
 * 用法：
 *   在【本地开发机】执行（需要能连 Turso）：
 *     node scripts/migrate-turso-to-sqlite.mjs --out ./data/qidian.db
 *
 *   在【服务器】上执行（从服务器直连 Turso 一次性拉取）：
 *     node scripts/migrate-turso-to-sqlite.mjs --out /var/lib/qidian/qidian.db
 *
 *   环境变量（从 .env.local 读）：
 *     TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 *
 * 行为：
 *   - 逐表导出 → 逐表导入，避免一次性拉 26MB 正文把连接拉断
 *   - 保留原始 id（避免 AUTOINCREMENT 序列错位导致关联失效）
 *   - 导入后逐表比对行数并输出校验报告
 *   - 幂等：目标库已存在时需加 --force 才会重建
 * ============================================================
 */
import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------- 参数 ----------
const args = process.argv.slice(2);
const getArg = (name, dflt = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const OUT = path.resolve(getArg('out', path.join(ROOT, 'data', 'qidian.db')));
const FORCE = args.includes('--force');

// ---------- 读取环境变量 ----------
function loadEnv() {
  const envFile = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envFile)) return {};
  const out = {};
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const line2 = line.trim();
    if (!line2 || line2.startsWith('#')) continue;
    const i = line2.indexOf('=');
    if (i < 0) continue;
    const k = line2.slice(0, i).trim();
    let v = line2.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}
const ENV = loadEnv();
const RAW_SRC_URL = process.env.TURSO_DATABASE_URL || ENV.TURSO_DATABASE_URL;
const SRC_TOKEN = process.env.TURSO_AUTH_TOKEN || ENV.TURSO_AUTH_TOKEN;

// 与 src/lib/db.ts 保持一致：libsql:// 是 WebSocket 协议，脚本侧统一走 https://
const SRC_URL = (RAW_SRC_URL || '').replace('libsql://', 'https://');

if (!RAW_SRC_URL) {
  console.error('✗ 缺少 TURSO_DATABASE_URL。请检查 .env.local 或用环境变量传入。');
  process.exit(1);
}
if (!/^https?:/.test(SRC_URL)) {
  console.error('✗ Turso 地址格式异常：', RAW_SRC_URL);
  process.exit(1);
}

// ---------- 表结构（与 src/lib/db.ts 保持一致） ----------
const TABLES = {
  categories: `
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      sort_order INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  articles: `
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
      is_banner INTEGER DEFAULT 0,
      view_count INTEGER DEFAULT 0,
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'published',
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )`,
  flash_news: `
    CREATE TABLE IF NOT EXISTS flash_news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      date_label TEXT DEFAULT '',
      published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      source TEXT DEFAULT '',
      source_url TEXT DEFAULT '',
      is_auto INTEGER DEFAULT 0
    )`,
  admin_users: `
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  wechat_config: `
    CREATE TABLE IF NOT EXISTS wechat_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      app_id TEXT NOT NULL,
      app_secret TEXT NOT NULL,
      access_token TEXT,
      token_expires_at INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
  comments: `
    CREATE TABLE IF NOT EXISTS comments (
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
};

const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category_id)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at)`,
  `CREATE INDEX IF NOT EXISTS idx_articles_featured ON articles(is_featured)`,
  `CREATE INDEX IF NOT EXISTS idx_flash_news_published ON flash_news(published_at)`,
  `CREATE INDEX IF NOT EXISTS idx_flash_news_source_url ON flash_news(source_url)`,
];

// ---------- 主流程 ----------
async function main() {
  console.log('═'.repeat(62));
  console.log('  奇点研习社 · Turso → SQLite 数据迁移');
  console.log('═'.repeat(62));
  console.log(`源      : ${SRC_URL.replace(/\/\/[^@]*@/, '//***@')}`);
  console.log(`目标    : ${OUT}`);

  if (fs.existsSync(OUT)) {
    if (!FORCE) {
      console.log('\n✗ 目标文件已存在。加 --force 覆盖重建：');
      console.log(`  node scripts/migrate-turso-to-sqlite.mjs --out "${OUT}" --force`);
      process.exit(1);
    }
    fs.rmSync(OUT, { force: true });
    fs.rmSync(OUT + '-journal', { force: true });
    console.log('已删除旧目标库（--force）');
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });

  const src = createClient({ url: SRC_URL, authToken: SRC_TOKEN });
  const dst = createClient({ url: `file:${OUT}` });

  // 建表
  console.log('\n[1/4] 建表与索引…');
  for (const sql of Object.values(TABLES)) await dst.execute(sql);
  for (const sql of INDEXES) await dst.execute(sql);
  console.log(`      ${Object.keys(TABLES).length} 张表 + ${INDEXES.length} 个索引`);

  // 逐表迁移
  console.log('\n[2/4] 迁移数据…');
  const report = [];
  for (const table of Object.keys(TABLES)) {
    const t0 = Date.now();

    // 先只取 id 列表（轻量），避免一次性拉 26MB 正文把连接拉断
    const idRes = await src.execute(`SELECT id FROM ${table} ORDER BY id`);
    const ids = idRes.rows.map((r) => r.id);

    if (ids.length === 0) {
      console.log(`      ${table.padEnd(14)} 0 行（空表，跳过）`);
      report.push({ table, src: 0, dst: 0, ok: true });
      continue;
    }

    // 再逐条取完整行（大字段表如 articles 必须逐条拉，否则 HTTP 连接会被中断）
    const rows = [];
    let cols = [];
    for (const id of ids) {
      const one = await src.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      if (one.rows.length > 0) {
        if (cols.length === 0) cols = one.columns || [];
        rows.push(one.rows[0]);
      }
    }

    // Result.columns 是字符串数组（列名），不是对象数组
    if (cols.length === 0) cols = idRes.columns || [];
    // 显式列出列，避开源表可能存在的额外列导致 INSERT 失败
    const colList = cols.map((c) => `"${c}"`).join(', ');
    const placeholders = cols.map(() => '?').join(', ');

    // 分批写入，避开单次 SQL 变量数上限
    const CHUNK = 20;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const stmts = chunk.map((r) => ({
        sql: `INSERT OR REPLACE INTO ${table} (${colList}) VALUES (${placeholders})`,
        args: cols.map((c) => {
          const v = r[c];
          if (v === undefined || v === null) return null;
          if (typeof v === 'bigint') return Number(v);
          if (v instanceof Uint8Array) return v;
          return v;
        }),
      }));
      await dst.batch(stmts);
    }
    const check = await dst.execute(`SELECT COUNT(*) AS c FROM ${table}`);
    const dstCount = Number(check.rows[0].c);
    const ok = dstCount === rows.length;
    const ms = Date.now() - t0;

    console.log(
      `      ${table.padEnd(14)} ${String(rows.length).padStart(4)} → ${String(dstCount).padStart(4)} 行` +
      `  ${ok ? '✓' : '✗ 不一致'}  ${ms}ms`
    );
    report.push({ table, src: rows.length, dst: dstCount, ok });
  }

  // 校验
  console.log('\n[3/4] 校验…');
  let allOk = true;
  for (const r of report) {
    if (!r.ok) allOk = false;
  }

  // sqlite_sequence 修正：保证后续 AUTOINCREMENT 从最大值继续
  console.log('\n[4/4] 修正自增序列…');
  for (const table of Object.keys(TABLES)) {
    try {
      const r = await dst.execute(`SELECT MAX(id) AS m FROM ${table}`);
      const maxId = Number(r.rows[0]?.m || 0);
      if (maxId > 0) {
        await dst.execute(
          `INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)
           ON CONFLICT(name) DO UPDATE SET seq = excluded.seq`,
          [table, maxId]
        );
      }
    } catch {
      /* sqlite_sequence 不存在时忽略，SQLite 会自动建 */
    }
  }
  console.log('      已同步');

  // 输出结果
  const size = fs.existsSync(OUT) ? fs.statSync(OUT).size : 0;
  console.log('\n' + '═'.repeat(62));
  if (allOk) {
    console.log('  ✓ 迁移完成，所有表行数一致');
  } else {
    console.log('  ✗ 存在行数不一致的表，请检查上方报告');
  }
  console.log(`  目标文件 : ${OUT}`);
  console.log(`  文件大小 : ${(size / 1024 / 1024).toFixed(2)} MB`);
  console.log('═'.repeat(62));

  console.log('\n下一步：');
  console.log('  1) 在服务器 .env 中设置：');
  console.log(`     TURSO_DATABASE_URL=file:${OUT}`);
  console.log('     TURSO_AUTH_TOKEN=            # 本地库不需要，留空即可');
  console.log('  2) 重启应用：pm2 restart qidian');
  console.log('');

  if (!allOk) process.exit(1);
}

main().catch((e) => {
  console.error('\n✗ 迁移失败：', e?.message || e);
  console.error(e?.stack || '');
  process.exit(1);
});
