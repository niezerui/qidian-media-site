'use client';

import { useState, useEffect, useCallback } from 'react';

interface Comment {
  id: number;
  article_id: number;
  parent_id: number | null;
  author_name: string;
  content: string;
  created_at: string;
}

export default function CommentSection({ articleId }: { articleId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?articleId=${articleId}`);
      const data = await res.json();
      if (data.success) setComments(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !authorName.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          parentId: replyTo?.id || null,
          authorName: authorName.trim(),
          content: content.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setContent('');
        setReplyTo(null);
        setSuccess('评论成功！');
        setTimeout(() => setSuccess(''), 3000);
        fetchComments();
      } else {
        setError(data.error || '提交失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 将评论组织成树形结构（一级评论 + 回复）
  const topLevel = comments.filter(c => !c.parent_id);
  const replies = comments.filter(c => c.parent_id);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <section className="max-w-3xl mx-auto py-10 border-t" style={{ borderColor: 'var(--c-border)' }}>
      <h2 className="text-lg font-bold mb-6" style={{ color: 'var(--c-text)' }}>
        评论 {comments.length > 0 && <span className="text-sm font-normal" style={{ color: 'var(--c-text-3)' }}>({comments.length})</span>}
      </h2>

      {/* 评论表单 */}
      <form onSubmit={handleSubmit} className="mb-8 p-4 rounded-xl" style={{ backgroundColor: 'var(--c-surface)' }}>
        {replyTo && (
          <div className="flex items-center justify-between mb-3 text-sm" style={{ color: 'var(--c-text-2)' }}>
            <span>回复 @{replyTo.name}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="hover:underline" style={{ color: 'var(--c-accent)' }}>取消回复</button>
          </div>
        )}
        <div className="flex items-center gap-3 mb-3">
          <input
            type="text"
            placeholder="你的昵称"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            maxLength={30}
            className="flex-1 px-4 py-2.5 border rounded-lg text-sm focus:outline-none"
            style={{ borderColor: 'var(--c-border)', backgroundColor: 'white' }}
            required
          />
        </div>
        <textarea
          placeholder={replyTo ? `回复 @${replyTo.name}...` : '写下你的评论...'}
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full px-4 py-3 border rounded-lg text-sm resize-none focus:outline-none mb-3"
          style={{ borderColor: 'var(--c-border)', backgroundColor: 'white' }}
          required
        />
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--c-text-3)' }}>{content.length}/2000</span>
          <button
            type="submit"
            disabled={submitting || !content.trim() || !authorName.trim()}
            className="px-5 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: submitting ? '#999' : 'var(--c-primary)' }}
          >
            {submitting ? '提交中...' : '发表评论'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        {success && <p className="mt-2 text-sm text-green-600">{success}</p>}
      </form>

      {/* 评论列表 */}
      {loading ? (
        <div className="text-center py-8" style={{ color: 'var(--c-text-3)' }}>加载评论中...</div>
      ) : topLevel.length === 0 ? (
        <div className="text-center py-8 text-sm" style={{ color: 'var(--c-text-3)' }}>暂无评论，来抢沙发吧</div>
      ) : (
        <div className="space-y-5">
          {topLevel.map(comment => {
            const commentReplies = replies.filter(r => r.parent_id === comment.id);
            return (
              <div key={comment.id}>
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ backgroundColor: `hsl(${(comment.author_name.charCodeAt(0) || 0) * 37 % 360}, 60%, 50%)` }}>
                    {comment.author_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium" style={{ color: 'var(--c-text)' }}>{comment.author_name}</span>
                      <span className="text-xs" style={{ color: 'var(--c-text-3)' }}>{formatDate(comment.created_at)}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--c-text-2)' }}>{comment.content}</p>
                    <button
                      onClick={() => setReplyTo({ id: comment.id, name: comment.author_name })}
                      className="text-xs mt-1 hover:underline"
                      style={{ color: 'var(--c-text-3)' }}
                    >
                      回复
                    </button>
                  </div>
                </div>

                {/* 回复列表 */}
                {commentReplies.length > 0 && (
                  <div className="ml-12 mt-3 space-y-3 pl-4 border-l-2" style={{ borderColor: 'var(--c-border)' }}>
                    {commentReplies.map(reply => (
                      <div key={reply.id} className="flex gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ backgroundColor: `hsl(${(reply.author_name.charCodeAt(0) || 0) * 37 % 360}, 50%, 50%)` }}>
                          {reply.author_name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium" style={{ color: 'var(--c-text)' }}>{reply.author_name}</span>
                            <span className="text-xs" style={{ color: 'var(--c-text-3)' }}>{formatDate(reply.created_at)}</span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: 'var(--c-text-2)' }}>{reply.content}</p>
                          <button
                            onClick={() => setReplyTo({ id: comment.id, name: reply.author_name })}
                            className="text-xs mt-0.5 hover:underline"
                            style={{ color: 'var(--c-text-3)' }}
                          >
                            回复
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
