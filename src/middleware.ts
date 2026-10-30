import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 兼容旧版 /?search=xxx 搜索链接 → 重定向到独立搜索页 /search?q=xxx
// （首页已改为 ISR 静态缓存，不能在页面内消费 searchParams，否则会失去缓存能力）
export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  if (pathname === '/') {
    const s = searchParams.get('search');
    if (s && s.trim()) {
      const url = req.nextUrl.clone();
      url.pathname = '/search';
      url.search = '';
      url.searchParams.set('q', s.trim());
      return NextResponse.redirect(url, 308);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
