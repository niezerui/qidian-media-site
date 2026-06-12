import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// 获取 access_token（自动刷新）
async function getAccessToken(): Promise<string | null> {
  const config = await queryOne('SELECT app_id, app_secret, access_token, token_expires_at FROM wechat_config WHERE id = 1');
  if (!config) return null;

  // 如果 token 还有 5 分钟以上有效期，直接用
  if (config.access_token && config.token_expires_at && config.token_expires_at > Date.now() + 5 * 60 * 1000) {
    return config.access_token;
  }

  // 刷新 token
  const res = await fetch(
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(config.app_id)}&secret=${encodeURIComponent(config.app_secret)}`
  );
  const data = await res.json();
  if (data.errcode) return null;

  await execute(
    'UPDATE wechat_config SET access_token = ?, token_expires_at = ? WHERE id = 1',
    [data.access_token, Date.now() + data.expires_in * 1000]
  );

  return data.access_token;
}

// 拉取草稿箱 + 已发表文章
export async function GET() {
  const admin = await getAuthUser();
  if (!admin) return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });

  const token = await getAccessToken();
  if (!token) return NextResponse.json({ success: false, error: '请先在设置中配置公众号 AppID 和 AppSecret' }, { status: 400 });

  const articles: any[] = [];

  // 1. 拉取草稿箱
  try {
    const draftRes = await fetch(`https://api.weixin.qq.com/cgi-bin/draft/batchget?access_token=${token}`, {
      method: 'POST',
      body: JSON.stringify({ offset: 0, count: 20 }),
    });
    const draftData = await draftRes.json();
    if (draftData.item) {
      for (const item of draftData.item) {
        const news = item.content?.news_item?.[0];
        if (news) {
          articles.push({
            id: item.media_id,
            mediaId: item.media_id,
            source: 'draft',
            title: news.title || '',
            digest: news.digest || '',
            coverUrl: news.thumb_url || '',
            pubTime: item.update_time ? new Date(item.update_time * 1000).toISOString() : '',
            hasContent: !!news.content,
          });
        }
      }
    }
  } catch (e) { console.error('Draft fetch error:', e); }

  // 2. 拉取已发表文章
  try {
      const pubRes = await fetch(`https://api.weixin.qq.com/cgi-bin/freepublish/batchget?access_token=${token}`, {
        method: 'POST',
        body: JSON.stringify({ offset: 0, count: 20 }),
      });
      const pubData = await pubRes.json();
      if (pubData.publish_list) {
        for (const pub of pubData.publish_list) {
          try {
            const detailRes = await fetch(`https://api.weixin.qq.com/cgi-bin/freepublish/get?access_token=${token}&publish_id=${pub.publish_id}`);
            const detailData = await detailRes.json();
            const news = detailData.news_item?.[0];
            if (news) {
              articles.push({
                id: pub.article_id || pub.publish_id,
                mediaId: pub.publish_id,
                source: 'published',
                title: news.title || '',
                digest: news.digest || '',
                coverUrl: news.cover_url || '',
                pubTime: pub.publish_time ? new Date(pub.publish_time * 1000).toISOString() : '',
                hasContent: !!news.content,
              });
            }
          } catch {}
        }
      }
    } catch (e) { console.error('Published fetch error:', e); }

  return NextResponse.json({ success: true, data: articles });
}
