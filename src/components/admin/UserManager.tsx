'use client';

import { useState, useEffect, useCallback } from 'react';

interface AdminUser {
  id: number;
  username: string;
  created_at: string;
}

export default function UserManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.success) setUsers(data.data);
      else setError(data.error);
    } catch { setError('加载用户列表失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setError('请填写用户名和密码'); return;
    }
    if (newUsername.trim().length < 3) { setError('用户名至少3个字符'); return; }
    if (newPassword.length < 6) { setError('密码至少6个字符'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`已添加管理员：${data.data.username}`);
        setTimeout(() => setSuccess(''), 2000);
        setNewUsername(''); setNewPassword(''); setShowAddForm(false);
        fetchUsers();
      } else { setError(data.error); }
    } catch { setError('添加失败'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number, username: string) => {
    if (!confirm(`确定删除管理员「${username}」？删除后该账号将无法登录。`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccess(`已删除：${username}`);
        setTimeout(() => setSuccess(''), 2000);
        fetchUsers();
      } else { setError(data.error); }
    } catch { setError('删除失败'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-brand-900">管理员用户 ({users.length})</h2>
          <p className="text-xs text-brand-400 mt-1">管理系统后台管理员账号</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800"
        >
          + 添加管理员
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex justify-between"><span>{error}</span><button onClick={() => setError('')}>&times;</button></div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">{success}</div>}

      {/* 添加表单 */}
      {showAddForm && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-bold text-brand-900 mb-3">添加管理员</h3>
          <form onSubmit={handleAddUser} className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-brand-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="至少3个字符"
                  className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                  required
                  minLength={3}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-brand-700 mb-1">密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="至少6个字符"
                  className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-brand-900 text-white text-sm rounded-lg hover:bg-brand-800 disabled:opacity-50"
              >
                {submitting ? '添加中...' : '确认添加'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-brand-200 text-brand-600 text-sm rounded-lg hover:bg-brand-50">取消</button>
            </div>
          </form>
        </div>
      )}

      {/* 用户列表 */}
      {loading ? (
        <div className="bg-white rounded-xl border border-brand-100 p-12 text-center text-brand-400 text-sm">加载中...</div>
      ) : (
        <div className="bg-white border border-brand-100 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-brand-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">用户名</th>
                <th className="text-left px-4 py-3 font-medium">创建时间</th>
                <th className="text-right px-4 py-3 font-medium w-24">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-brand-50/50">
                  <td className="px-4 py-3 text-brand-900 font-medium">{u.username}</td>
                  <td className="px-4 py-3 text-brand-400 text-xs">{new Date(u.created_at).toLocaleString('zh-CN')}</td>
                  <td className="px-4 py-3 text-right">
                    {users.length > 1 && (
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        删除
                      </button>
                    )}
                    {users.length <= 1 && <span className="text-xs text-brand-300">当前唯一管理员</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 安全提示 */}
      <div className="mt-6 p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
        <h4 className="text-sm font-medium text-brand-900 mb-1">🔐 安全提示</h4>
        <ul className="text-xs text-brand-500 space-y-1 list-disc list-inside">
          <li>管理员拥有所有后台权限，请谨慎添加</li>
          <li>如需修改密码，请前往「⚙ 设置」页面</li>
          <li>至少保留一个管理员账号</li>
        </ul>
      </div>
    </div>
  );
}
