'use client';

import { useEffect } from 'react';

/**
 * 文章阅读量追踪组件
 * 页面加载时自动调用 /api/articles/view 递增阅读量
 * 服务端通过 IP 去重，24h 内同一 IP 不重复计数
 */
export default function ViewTracker({ articleId }: { articleId: number }) {
  useEffect(() => {
    fetch('/api/articles/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: articleId }),
    }).catch(() => {}); // 静默失败，不影响页面
  }, [articleId]);

  return null; // 无 UI，纯功能组件
}
