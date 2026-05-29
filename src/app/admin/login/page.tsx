'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success) {
        router.push('/admin/dashboard');
      } else {
        setError(data.error || '登录失败');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-900 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">奇</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-900">奇点管理后台</h1>
          <p className="text-sm text-brand-400 mt-1">登录以管理内容</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-brand-100 p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-all text-sm"
                placeholder="请输入用户名"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-700 mb-1.5">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-all text-sm"
                placeholder="请输入密码"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </div>

          <p className="mt-4 text-xs text-brand-400 text-center">
            默认账号: admin / admin123
          </p>
        </form>
      </div>
    </div>
  );
}
