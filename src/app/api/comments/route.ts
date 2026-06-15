import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute } from '@/lib/db';
import { sanitizeInput } from '@/lib/security';
import { checkRateLimit } from '@/lib/security';

// GET /api/comments?articleId=123
// 获取文章评论列表（仅已审核通过的）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');
    if (!articleId || isNaN(Number(articleId))) {
      return NextResponse.json({ success: false, error: '缺少文章ID' }, { status: 400 });
    }

    const rows = await query(
      `SELECT id, article_id, parent_id, author_name, content, created_at
       FROM comments
       WHERE article_id = ? AND status = 'approved'
       ORDER BY created_at DESC
       LIMIT 500`,
      [Number(articleId)]
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/comments — 游客评论
export async function POST(request: NextRequest) {
  try {
    // 频率限制：每IP每分钟5条
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
    const rl = checkRateLimit(`comment:${ip}`, 5, 60000);
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: '评论太频繁，请稍后再试' }, { status: 429 });
    }

    const body = await request.json();
    const articleId = parseInt(body.articleId);
    const parentId = body.parentId ? parseInt(body.parentId) : null;
    const authorName = sanitizeInput((body.authorName || '匿名用户').trim().slice(0, 30));
    const content = sanitizeInput((body.content || '').trim().slice(0, 2000));

    // 验证
    if (!articleId || isNaN(articleId)) {
      return NextResponse.json({ success: false, error: '缺少文章ID' }, { status: 400 });
    }
    if (!content || content.length < 2) {
      return NextResponse.json({ success: false, error: '评论内容不能为空或太短' }, { status: 400 });
    }
    if (!authorName) {
      return NextResponse.json({ success: false, error: '请填写昵称' }, { status: 400 });
    }

    // 验证文章存在
    const article = await queryOne('SELECT id FROM articles WHERE id = ?', [articleId]);
    if (!article) {
      return NextResponse.json({ success: false, error: '文章不存在' }, { status: 404 });
    }

    // 如果有 parentId，验证父评论存在且属于同一篇文章
    if (parentId) {
      const parent = await queryOne('SELECT id FROM comments WHERE id = ? AND article_id = ?', [parentId, articleId]);
      if (!parent) {
        return NextResponse.json({ success: false, error: '回复的评论不存在' }, { status: 400 });
      }
    }

    // 敏感词简单过滤
    const sensitiveWords = ['fuck', 'shit', '傻逼', '草泥马', '他妈的', '你妈的', '操你', 'CNM'];
    let filteredContent = content;
    for (const word of sensitiveWords) {
      if (filteredContent.toLowerCase().includes(word.toLowerCase())) {
        filteredContent = filteredContent.replace(new RegExp(word, 'gi'), '***');
      }
    }

    const result = await execute(
      `INSERT INTO comments (article_id, parent_id, author_name, content, status, ip)
       VALUES (?, ?, ?, ?, 'approved', ?)`,
      [articleId, parentId, authorName, filteredContent, ip]
    );

    const comment = await queryOne('SELECT id, article_id, parent_id, author_name, content, created_at FROM comments WHERE id = ?', [result.lastInsertRowid]);

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
