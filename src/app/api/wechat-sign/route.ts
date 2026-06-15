import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import crypto from 'crypto';

// 获取微信公众号 access_token（复用 wechat-config 里存的）
async function getAccessToken(): Promise<string | null> {
  const config = await queryOne('SELECT app_id, app_secret, access_token, token_expires_at FROM wechat_config WHERE id = 1');
  if (!config) return null;
  const now = Math.floor(Date.now() / 1000);
  if (config.access_token && config.token_expires_at && config.token_expires_at - now > 300) {
    return config.access_token;
  }
  // 刷新 token
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.app_id}&secret=${config.app_secret}`
  );
  const data = await res.json();
  if (data.errcode) return null;
  await execute(
    'UPDATE wechat_config SET access_token = ?, token_expires_at = ? WHERE id = 1',
    [data.access_token, now + data.expires_in]
  );
  return data.access_token;
}

// jsapi_ticket 内存缓存
let _jsapiTicket: string | null = null;
let _jsapiTicketExpires = 0;

async function getJsapiTicket(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (_jsapiTicket && _jsapiTicketExpires - now > 300) return _jsapiTicket;
  const token = await getAccessToken();
  if (!token) return null;
  const res = await fetch(`https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${token}&type=jsapi`);
  const data = await res.json();
  if (data.errcode !== 0) return null;
  _jsapiTicket = data.ticket;
  _jsapiTicketExpires = now + data.expires_in;
  return _jsapiTicket;
}

// GET /api/wechat-sign?url=<当前页面URL>
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) return NextResponse.json({ success: false, error: '缺少 url 参数' }, { status: 400 });

    const ticket = await getJsapiTicket();
    if (!ticket) {
      return NextResponse.json({ success: false, error: '未配置微信公众号 API 或获取 ticket 失败' }, { status: 503 });
    }

    const config = await queryOne('SELECT app_id FROM wechat_config WHERE id = 1');
    if (!config) return NextResponse.json({ success: false, error: '未配置公众号' }, { status: 503 });

    const nonceStr = Math.random().toString(36).slice(2, 18);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // 签名字符串（字典序）
    const str = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    const signature = crypto.createHash('sha1').update(str).digest('hex');

    return NextResponse.json({
      success: true,
      data: {
        appId: config.app_id,
        timestamp,
        nonceStr,
        signature,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
