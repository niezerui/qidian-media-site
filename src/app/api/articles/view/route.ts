import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';

// POST /api/articles/view
// 记录文章阅读量，同一 IP 24小时内不重复计数（防刷）
const ipCountMap = new Map<string, Map<number, number>>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = parseInt(body.id);
    if (!id || isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid article id' }, { status: 400 });
    }

    // 获取客户端 IP（Vercel 通过 x-forwarded-for 传递）
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

    // 24h 去重
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    let ipMap = ipCountMap.get(ip);
    if (!ipMap) { ipMap = new Map(); ipCountMap.set(ip, ipMap); }
    const lastCount = ipMap.get(id);
    if (lastCount && now - lastCount < dayMs) {
      return NextResponse.json({ success: true, counted: false });
    }
    ipMap.set(id, now);

    // 清理过期记录
    ipCountMap.forEach((m, k) => {
      m.forEach((ts, aid) => { if (now - ts > dayMs) m.delete(aid); });
      if (m.size === 0) ipCountMap.delete(k);
    });

    await execute(`UPDATE articles SET view_count = view_count + 1 WHERE id = ?`, [id]);

    return NextResponse.json({ success: true, counted: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
