'use client';

import { useState, useEffect, useCallback } from 'react';

interface Comment {
  id: number;
  article_id: number;
  parent_id: number | null;
  author_name: string;
  content: string;
  status: string;
  ip: string;
  created_at: string;
  article_title?: string;
  article_slug?: string;
}

export default function CommentManager() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'spam'>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comments?status=${statusFilter}`);
      const data = await res.json();
      if (data.success) setComments(data.data);
      else setError(data.error);
    } catch { setError('加载评论失败'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`评论已${status === 'spam' ? '标记为垃圾' : '审核通过'}`);
        setTimeout(() => setSuccess(''), 2000);
        fetchComments();
      } else {
        setError(data.error);
      }
    } catch { setError('操作失败'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此评论及其回复？')) return;
    try {
      const res = await fetch(`/api/admin/comments?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccess('评论已删除');
        setTimeout(() => setSuccess(''), 2000);
        fetchComments();
      } else setError(data.error);
    } catch { setError('删除失败'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-brand-900">评论管理 ({comments.length})</h2>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex justify-between"><span>{error}</span><button onClick={() => setError('')}>&times;</button></div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">{success}</div>}

      {/* 状态筛选 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === 'all' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:text-brand-900 bg-white border border-brand-200'}`}
        >
          全部
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === 'approved' ? 'bg-green-600 text-white' : 'text-green-600 hover:text-green-700 bg-white border border-green-200'}`}
        >
          已审核
        </button>
        <button
          onClick={() => setStatusFilter('spam')}
          className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === 'spam' ? 'bg-red-500 text-white' : 'text-red-500 hover:text-red-600 bg-white border border-red-200'}`}
        >
          垃圾评论
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-brand-100 p-12 text-center text-brand-400 text-sm">加载中...</div>
      ) : comments.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-100 p-12 text-center text-brand-400 text-sm">暂无评论</div>
      ) : (
        <div className="bg-white border border-brand-100 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-brand-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">评论者</th>
                  <th className="text-left px-4 py-3 font-medium">内容</th>
                  <th className="text-left px-4 py-3 font-medium">文章</th>
                  <th className="text-center px-4 py-3 font-medium w-16">状态</th>
                  <th className="text-left px-4 py-3 font-medium w-28">时间</th>
                  <th className="text-right px-4 py-3 font-medium w-32">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {comments.map(c => (
                  <tr key={c.id} className="hover:bg-brand-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-900">{c.author_name}</div>
                      <div className="text-xs text-brand-400 font-mono">{c.ip}</div>
                    </td>
                    <td className="px-4 py-3 text-brand-700 max-w-[300px] truncate">{c.content}</td>
                    <td className="px-4 py-3">
                      {c.article_title ? (
                        <a href={`/article/${c.article_slug}`} target="_blank" className="text-brand-600 hover:underline text-xs line-clamp-2 max-w-[180px]">
                          {c.article_title}
                        </a>
                      ) : (
                        <span className="text-brand-400 text-xs">已删除</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'spam' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {c.status === 'spam' ? '垃圾' : '已审核'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-400 whitespace-nowrap text-xs">
                      {new Date(c.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status !== 'spam' && (
                        <button
                          onClick={() => handleStatusChange(c.id, 'spam')}
                          className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded mr-1"
                        >
                          标记垃圾
                        </button>
                      )}
                      {c.status === 'spam' && (
                        <button
                          onClick={() => handleStatusChange(c.id, 'approved')}
                          className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded mr-1"
                        >
                          通过
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-xs px-2 py-1 text-red-400 hover:bg-red-50 rounded"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
