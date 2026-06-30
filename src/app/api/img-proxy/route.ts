import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 针对不同域名使用最合适的 Referer（绕过防盗链）
const DOMAIN_REFERERS: Record<string, string> = {
  'mmbiz.qpic.cn': 'https://mp.weixin.qq.com/',
  'mmbiz.qlogo.cn': 'https://mp.weixin.qq.com/',
  'mmbiz3.qpic.cn': 'https://mp.weixin.qq.com/',
  'p3-sign.douyinpic.com': 'https://www.douyin.com/',
  'p9-sign.douyinpic.com': 'https://www.douyin.com/',
  'p6-sign.douyinpic.com': 'https://www.douyin.com/',
  'p26-sign.douyinpic.com': 'https://www.douyin.com/',
  'p3-pc-sign.douyinpic.com': 'https://www.douyin.com/',
  'p6-pc-sign.douyinpic.com': 'https://www.douyin.com/',
  'inews.gtimg.com': 'https://new.qq.com/',
  'n.sinaimg.cn': 'https://weibo.com/',
  'img.dingxinwen.cn': 'https://www.dingxinwen.cn/',
  'img3.dingxinwen.cn': 'https://www.dingxinwen.cn/',
  'pic.rmb.bdstatic.com': 'https://baijiahao.baidu.com/',
  'nimg.ws.126.net': 'https://www.163.com/',
  'p1.itc.cn': 'https://www.sohu.com/',
};

// 图片代理：绕过防盗链，服务端获取图片后转发给浏览器
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url param', { status: 400 });
  }

  // 只允许 http/https 协议
  let targetUrl: URL;
  try {
    targetUrl = new URL(url);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return new NextResponse('Invalid url', { status: 400 });
    }
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  // 确定合适的 Referer（根据域名选择）
  const hostname = targetUrl.hostname;
  const referer = DOMAIN_REFERERS[hostname]
    || DOMAIN_REFERERS[Object.keys(DOMAIN_REFERERS).find(d => hostname.endsWith('.' + d) || hostname === d) || '']
    || targetUrl.origin;

  try {
    const res = await fetch(targetUrl.toString(), {
      headers: {
        // 伪装成浏览器请求，绕过防盗链
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      // 15 秒超时（微信图片可能较慢）
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`[img-proxy] upstream error ${res.status} for ${targetUrl.hostname}`);
      // 对于 403（防盗链），返回透明1x1 GIF 避免页面显示破图
      if (res.status === 403 || res.status === 401) {
        const gif1x1 = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
        return new NextResponse(gif1x1, {
          status: 200,
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'public, max-age=60',
          },
        });
      }
      return new NextResponse(`Upstream error: ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    // 只转发图片类型（宽松匹配）
    if (!contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      return new NextResponse('Not an image', { status: 400 });
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType.startsWith('image/') ? contentType : 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[img-proxy] error:', err?.message);
    return new NextResponse('Failed to fetch image', { status: 500 });
  }
}
