import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { sanitizeInput } from '@/lib/security';

const AUTO_IMPORT_KEY = process.env.FLASH_AUTO_KEY || 'qidian-flash-auto-2026-secure';

interface FlashItem {
  title: string;
  content?: string;
  source?: string;
  source_url?: string;
  published_at?: string;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-auto-import-key');
    if (apiKey !== AUTO_IMPORT_KEY) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const items: FlashItem[] = Array.isArray(body.items) ? body.items : [body];

    if (items.length === 0) {
      return NextResponse.json({ success: false, error: 'No items provided' }, { status: 400 });
    }

    let inserted = 0;
    let duplicated = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        if (!item.title || item.title.trim().length === 0) {
          errors.push('Missing title for an item');
          continue;
        }

        const title = sanitizeInput(item.title.trim().slice(0, 200));
        const content = sanitizeInput(item.content || '').slice(0, 5000);
        const source = sanitizeInput(item.source || '').slice(0, 50);
        const sourceUrl = (item.source_url || '').slice(0, 500);
        const publishedAt = item.published_at || new Date().toISOString();

        // Dedup: check by source_url if present, otherwise by title
        let existing: any = null;
        if (sourceUrl) {
          existing = await queryOne('SELECT id FROM flash_news WHERE source_url = ?', [sourceUrl]);
        }
        if (!existing) {
          existing = await queryOne('SELECT id FROM flash_news WHERE title = ?', [title]);
        }

        if (existing) {
          duplicated++;
          continue;
        }

        // Generate date_label from published_at (e.g. "7月3日")
        const d = new Date(publishedAt);
        const dateLabel = `${d.getMonth() + 1}\u6708${d.getDate()}\u65e5`;

        await execute(
          `INSERT INTO flash_news (title, content, date_label, published_at, source, source_url, is_auto) VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [title, content, dateLabel, publishedAt, source, sourceUrl]
        );
        inserted++;
      } catch (e: any) {
        errors.push(`Failed to insert "${item.title?.slice(0, 30)}": ${e.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      duplicated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-auto-import-key');
    if (apiKey !== AUTO_IMPORT_KEY) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    // Return auto-import stats
    const totalAuto = await queryOne('SELECT COUNT(*) as total FROM flash_news WHERE is_auto = 1');
    const lastAuto = await queryOne('SELECT published_at FROM flash_news WHERE is_auto = 1 ORDER BY published_at DESC LIMIT 1');
    const sources = await query('SELECT source, COUNT(*) as count FROM flash_news WHERE is_auto = 1 GROUP BY source ORDER BY count DESC');

    return NextResponse.json({
      success: true,
      totalAuto: totalAuto?.total ?? 0,
      lastAutoTime: lastAuto?.published_at ?? null,
      sources: sources.map((s: any) => ({ source: s.source, count: s.count })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
