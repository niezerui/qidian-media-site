import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// 获取当前配置（返回脱敏的 secret）
export async function GET() {
  const admin = await getAuthUser();
  if (!admin) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });

  const config = await queryOne('SELECT app_id, substr(app_secret, 1, 4) || "****" || substr(app_secret, -2) AS app_secret_masked, updated_at FROM wechat_config WHERE id = 1');
  return NextResponse.json({ success: true, data: config || null });
}

// 保存配置并验证
export async function POST(req: NextRequest) {
  const admin = await getAuthUser();
  if (!admin) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });

  const { appId, appSecret } = await req.json();
  if (!appId || !appSecret) return NextResponse.json({ success: false, error: '请填写 AppID 和 AppSecret' }, { status: 400 });

  // 验证：用这两个凭证去拿 access_token
  const verifyRes = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(appSecret)}`
  );
  const verifyData = await verifyRes.json();

  if (verifyData.errcode) {
    return NextResponse.json({ success: false, error: `验证失败：${verifyData.errmsg || 'AppID 或 AppSecret 错误'}` }, { status: 400 });
  }

  // 保存（用 INSERT OR REPLACE，因为 id 固定为 1）
  await execute(
    `INSERT OR REPLACE INTO wechat_config (id, app_id, app_secret, access_token, token_expires_at, updated_at)
     VALUES (1, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [appId, appSecret, verifyData.access_token, Date.now() + verifyData.expires_in * 1000]
  );

  return NextResponse.json({ success: true, data: { appId, tokenExpiresIn: verifyData.expires_in } });
}
