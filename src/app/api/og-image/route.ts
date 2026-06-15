import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { extractFirstImage } from '@/lib/security';

/**
 * GET /api/og-image?slug=article-slug
 *
 * 将文章封面图（包括 base64 data URI）转换为真实图片响应，
 * 使微信/社交媒体爬虫能够读取到 OG Image。
 *
 * 用法：
 *   <meta property="og:image" content="https://www.qidianyanjiushe.com/api/og-image?slug=xxx" />
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return new NextResponse(null, { status: 400 });
    }

    // 查询文章封面
    const article = await queryOne(
      'SELECT cover_image, content FROM articles WHERE slug = ?',
      [slug]
    );

    if (!article) {
      return new NextResponse(null, { status: 404 });
    }

    // 获取封面图（优先封面字段，其次提取正文第一张图）
    const coverImage: string | null = article.cover_image || extractFirstImage(article.content);

    if (!coverImage) {
      return new NextResponse(null, { status: 404 });
    }

    // 如果是 data: URI（base64），直接解码后返回图片
    if (coverImage.startsWith('data:')) {
      const match = coverImage.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return new NextResponse(null, { status: 404 });
      const mimeType = match[1];
      const buffer = Buffer.from(match[2], 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        },
      });
    }

    // 如果是外链图片，代理获取
    const response = await fetch(coverImage, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        Referer: 'https://www.qidianyanjiushe.com/',
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return new NextResponse(null, { status: 502 });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const buffer = Buffer.from(await response.arrayBuffer());

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('og-image error:', error);
    return new NextResponse(null, { status: 500 });
  }
}
