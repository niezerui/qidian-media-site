import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, execute, executeBatch } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { sanitizeInput, generateSlug } from '@/lib/security';

const ORDER_BY = 'ORDER BY (c.sort_order IS NULL), c.sort_order, c.id';

function unauthorized(error: any) {
  if (error?.message === 'Unauthorized') {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 });
  }
  return NextResponse.json({ success: false, error: error?.message || '服务器错误' }, { status: 500 });
}

// 分类列表（含文章数，按后台维护的顺序）
export async function GET() {
  try {
    await requireAuth();
    const categories = await query(
      `SELECT c.id, c.slug, c.name, c.description, c.sort_order,
              (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) AS article_count
       FROM categories c ${ORDER_BY}`
    );
    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    return unauthorized(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const name = sanitizeInput((body.name || '').trim());

    if (!name) {
      return NextResponse.json({ success: false, error: '分类名称不能为空' }, { status: 400 });
    }

    if (name.length > 20) {
      return NextResponse.json({ success: false, error: '分类名称不能超过20个字符' }, { status: 400 });
    }

    let slug = generateSlug(name);
    const existing = await queryOne('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // 新分类排到最后
    const maxRow = await queryOne('SELECT MAX(sort_order) AS mx FROM categories');
    const nextOrder = Number((maxRow as any)?.mx ?? 0) + 1;

    const result = await execute(
      'INSERT INTO categories (slug, name, description, sort_order) VALUES (?, ?, ?, ?)',
      [slug, name, '', nextOrder]
    );

    const category = await queryOne(
      'SELECT c.id, c.slug, c.name, c.description, c.sort_order, 0 AS article_count FROM categories c WHERE c.id = ?',
      [result.lastInsertRowid]
    );
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    return unauthorized(error);
  }
}

// 重命名分类（slug 保持不变，避免破坏已发布文章的链接）
export async function PUT(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const id = Number(body.id);
    const name = sanitizeInput((body.name || '').trim());

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少分类ID' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ success: false, error: '分类名称不能为空' }, { status: 400 });
    }
    if (name.length > 20) {
      return NextResponse.json({ success: false, error: '分类名称不能超过20个字符' }, { status: 400 });
    }

    const existing = await queryOne('SELECT id FROM categories WHERE id = ?', [id]);
    if (!existing) {
      return NextResponse.json({ success: false, error: '分类不存在' }, { status: 404 });
    }

    await execute('UPDATE categories SET name = ? WHERE id = ?', [name, id]);
    const category = await queryOne(
      'SELECT id, slug, name, description, sort_order FROM categories WHERE id = ?',
      [id]
    );
    return NextResponse.json({ success: true, data: category });
  } catch (error: any) {
    return unauthorized(error);
  }
}

// 调整导航顺序：body = { order: [id1, id2, ...] }（按目标顺序列出全部分类 id）
export async function PATCH(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const order: unknown = body.order;

    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ success: false, error: '缺少排序数据' }, { status: 400 });
    }

    const ids = order.map(n => Number(n)).filter(n => Number.isInteger(n) && n > 0);
    if (ids.length !== order.length) {
      return NextResponse.json({ success: false, error: '排序数据不合法' }, { status: 400 });
    }

    const rows = await query('SELECT id FROM categories');
    const known = new Set(rows.map((r: any) => Number(r.id)));
    if (ids.length !== known.size || ids.some(id => !known.has(id))) {
      return NextResponse.json({ success: false, error: '排序列表与现有分类不一致，请刷新后重试' }, { status: 400 });
    }

    await executeBatch(
      ids.map((id, idx) => ({ sql: 'UPDATE categories SET sort_order = ? WHERE id = ?', args: [idx + 1, id] }))
    );

    return NextResponse.json({ success: true, message: '顺序已保存', data: { order: ids } });
  } catch (error: any) {
    return unauthorized(error);
  }
}

/**
 * 删除分类。
 * - 无文章：直接删除。
 * - 有文章：必须带 moveTo=<目标分类id>，先把文章整体迁移过去再删除，
 *   以保证不会出现「没有归属导航」的文章。
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    const moveToRaw = searchParams.get('moveTo');
    const moveTo = moveToRaw ? Number(moveToRaw) : null;

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少分类ID' }, { status: 400 });
    }

    const target = await queryOne('SELECT id, name FROM categories WHERE id = ?', [id]);
    if (!target) {
      return NextResponse.json({ success: false, error: '分类不存在' }, { status: 404 });
    }

    const totalRow = await queryOne('SELECT COUNT(*) AS cnt FROM categories');
    const totalCats = Number((totalRow as any)?.cnt ?? 0);
    if (totalCats <= 1) {
      return NextResponse.json(
        { success: false, error: '至少要保留一个分类，无法删除最后一个分类。' },
        { status: 400 }
      );
    }

    const countRow = await queryOne('SELECT COUNT(*) AS cnt FROM articles WHERE category_id = ?', [id]);
    const articleCount = Number((countRow as any)?.cnt ?? 0);

    if (articleCount > 0) {
      if (!moveTo) {
        return NextResponse.json(
          {
            success: false,
            needMigrate: true,
            articleCount,
            error: `该分类下还有 ${articleCount} 篇文章，请选择要转移到哪个分类，或先删除这些文章。`,
          },
          { status: 400 }
        );
      }
      if (moveTo === id) {
        return NextResponse.json({ success: false, error: '不能转移到被删除的分类本身' }, { status: 400 });
      }
      const dest = await queryOne('SELECT id, name FROM categories WHERE id = ?', [moveTo]);
      if (!dest) {
        return NextResponse.json({ success: false, error: '目标分类不存在，请刷新后重试' }, { status: 404 });
      }

      await execute(
        'UPDATE articles SET category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE category_id = ?',
        [moveTo, id]
      );
    }

    const result = await execute('DELETE FROM categories WHERE id = ?', [id]);
    if (!result.rowsAffected) {
      return NextResponse.json({ success: false, error: '分类不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: articleCount > 0 ? `已将 ${articleCount} 篇文章转移，并删除分类「${(target as any).name}」` : '删除成功',
      moved: articleCount,
    });
  } catch (error: any) {
    return unauthorized(error);
  }
}
