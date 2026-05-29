'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Article {
  id: number;
  title: string;
  category_name: string;
  author: string;
  is_featured: boolean;
  published_at: string;
  view_count: number;
}

interface FlashItem {
  id: number;
  title: string;
  date_label: string;
  published_at: string;
}

interface Category {
  id: number;
  slug: string;
  name: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'articles' | 'flashes'>('articles');
  const [articles, setArticles] = useState<Article[]>([]);
  const [flashes, setFlashes] = useState<FlashItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Article form state
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [articleForm, setArticleForm] = useState({
    title: '',
    summary: '',
    content: '',
    category_id: '',
    author: '奇点编辑部',
    tags: '',
    cover_image: '',
    is_featured: false,
    is_exclusive: false,
  });

  // Flash form state
  const [showFlashForm, setShowFlashForm] = useState(false);
  const [flashForm, setFlashForm] = useState({
    title: '',
    content: '',
    date_label: '',
  });

  // File upload
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'image' | 'video'>('image');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const [articlesRes, flashesRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/articles'),
        fetch('/api/admin/flashes'),
        fetch('/api/admin/categories'),
      ]);

      if (articlesRes.status === 401) {
        router.push('/admin/login');
        return;
      }

      const articlesData = await articlesRes.json();
      const flashesData = await flashesRes.json();
      const categoriesData = await categoriesRes.json();

      if (articlesData.success) setArticles(articlesData.data);
      if (flashesData.success) setFlashes(flashesData.data);
      if (categoriesData.success) setCategories(categoriesData.data);
    } catch (err) {
      setError('加载数据失败');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Article CRUD
  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tags = articleForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const method = editingArticle ? 'PUT' : 'POST';
      const body: any = {
        ...articleForm,
        tags,
        category_id: parseInt(articleForm.category_id),
        is_featured: articleForm.is_featured,
        is_exclusive: articleForm.is_exclusive,
      };

      if (editingArticle) {
        body.id = editingArticle.id;
      }

      const url = editingArticle
        ? '/api/admin/articles'
        : '/api/admin/articles';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        resetArticleForm();
        fetchData();
      } else {
        setError(data.error || '操作失败');
      }
    } catch (err) {
      setError('网络错误');
    }
  };

  const handleDeleteArticle = async (id: number) => {
    if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) return;

    try {
      const res = await fetch(`/api/admin/articles?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        setError(data.error || '删除失败');
      }
    } catch (err) {
      setError('网络错误');
    }
  };

  const handleEditArticle = (article: any) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title || '',
      summary: article.summary || '',
      content: article.content || '',
      category_id: String(article.category_id || ''),
      author: article.author || '奇点编辑部',
      tags: (article.tags || []).join(', '),
      cover_image: article.cover_image || '',
      is_featured: article.is_featured || false,
      is_exclusive: article.is_exclusive || false,
    });
    setShowArticleForm(true);
  };

  const resetArticleForm = () => {
    setEditingArticle(null);
    setArticleForm({
      title: '',
      summary: '',
      content: '',
      category_id: '',
      author: '奇点编辑部',
      tags: '',
      cover_image: '',
      is_featured: false,
      is_exclusive: false,
    });
    setShowArticleForm(false);
  };

  // Flash CRUD
  const handleFlashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/flashes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flashForm),
      });

      const data = await res.json();
      if (data.success) {
        setFlashForm({ title: '', content: '', date_label: '' });
        setShowFlashForm(false);
        fetchData();
      } else {
        setError(data.error || '操作失败');
      }
    } catch (err) {
      setError('网络错误');
    }
  };

  const handleDeleteFlash = async (id: number) => {
    if (!confirm('确定要删除这条快讯吗？')) return;

    try {
      const res = await fetch(`/api/admin/flashes?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        setError(data.error || '删除失败');
      }
    } catch (err) {
      setError('网络错误');
    }
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', uploadType);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        // Insert the uploaded file URL into content
        if (uploadType === 'image') {
          const imgTag = `<img src="${data.data.url}" alt="${file.name}" />`;
          setArticleForm((prev) => ({
            ...prev,
            content: prev.content + '\n' + imgTag,
          }));
        } else {
          const videoTag = `<video src="${data.data.url}" controls></video>`;
          setArticleForm((prev) => ({
            ...prev,
            content: prev.content + '\n' + videoTag,
          }));
        }
      } else {
        setError(data.error || '上传失败');
      }
    } catch (err) {
      setError('上传失败');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-900 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-brand-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-900 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">奇</span>
              </div>
              <h1 className="text-lg font-bold text-brand-900">管理后台</h1>
            </div>
            <div className="flex items-center gap-4">
              <a href="/" target="_blank" className="text-sm text-brand-500 hover:text-brand-900 transition-colors">
                查看网站
              </a>
              <button
                onClick={async () => {
                  await fetch('/api/auth', { method: 'DELETE' });
                  router.push('/admin/login');
                }}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 bg-white rounded-lg border border-brand-100 p-1 w-fit">
          <button
            onClick={() => setActiveTab('articles')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'articles'
                ? 'bg-brand-900 text-white'
                : 'text-brand-500 hover:text-brand-900'
            }`}
          >
            文章管理
          </button>
          <button
            onClick={() => setActiveTab('flashes')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'flashes'
                ? 'bg-brand-900 text-white'
                : 'text-brand-500 hover:text-brand-900'
            }`}
          >
            快讯管理
          </button>
        </div>

        {/* Articles Tab */}
        {activeTab === 'articles' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-brand-900">
                文章列表 ({articles.length})
              </h2>
              <button
                onClick={() => {
                  resetArticleForm();
                  setShowArticleForm(true);
                }}
                className="px-4 py-2 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800 transition-colors"
              >
                + 新建文章
              </button>
            </div>

            {/* Article Form */}
            {showArticleForm && (
              <div className="bg-white border border-brand-100 rounded-xl p-6 mb-6 shadow-sm">
                <h3 className="text-base font-bold text-brand-900 mb-4">
                  {editingArticle ? '编辑文章' : '新建文章'}
                </h3>
                <form onSubmit={handleArticleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-brand-700 mb-1">标题 *</label>
                      <input
                        type="text"
                        value={articleForm.title}
                        onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                        className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-700 mb-1">分类 *</label>
                      <select
                        value={articleForm.category_id}
                        onChange={(e) => setArticleForm({ ...articleForm, category_id: e.target.value })}
                        className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                        required
                      >
                        <option value="">选择分类</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-700 mb-1">作者</label>
                      <input
                        type="text"
                        value={articleForm.author}
                        onChange={(e) => setArticleForm({ ...articleForm, author: e.target.value })}
                        className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-brand-700 mb-1">摘要</label>
                      <textarea
                        value={articleForm.summary}
                        onChange={(e) => setArticleForm({ ...articleForm, summary: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-700 mb-1">标签（逗号分隔）</label>
                      <input
                        type="text"
                        value={articleForm.tags}
                        onChange={(e) => setArticleForm({ ...articleForm, tags: e.target.value })}
                        placeholder="AI, 大模型, 科技"
                        className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-700 mb-1">封面图片URL</label>
                      <input
                        type="text"
                        value={articleForm.cover_image}
                        onChange={(e) => setArticleForm({ ...articleForm, cover_image: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-brand-700">
                      <input
                        type="checkbox"
                        checked={articleForm.is_featured}
                        onChange={(e) => setArticleForm({ ...articleForm, is_featured: e.target.checked })}
                        className="rounded border-brand-300"
                      />
                      设为推荐
                    </label>
                    <label className="flex items-center gap-2 text-sm text-brand-700">
                      <input
                        type="checkbox"
                        checked={articleForm.is_exclusive}
                        onChange={(e) => setArticleForm({ ...articleForm, is_exclusive: e.target.checked })}
                        className="rounded border-brand-300"
                      />
                      独家标记
                    </label>
                  </div>

                  {/* Content Editor */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-brand-700">内容（HTML）</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={uploadType}
                          onChange={(e) => setUploadType(e.target.value as 'image' | 'video')}
                          className="text-xs border border-brand-200 rounded px-2 py-1"
                        >
                          <option value="image">图片</option>
                          <option value="video">视频</option>
                        </select>
                        <label className="text-xs px-3 py-1 bg-brand-100 text-brand-700 rounded cursor-pointer hover:bg-brand-200 transition-colors">
                          {uploading ? '上传中...' : `上传${uploadType === 'image' ? '图片' : '视频'}`}
                          <input
                            type="file"
                            accept={uploadType === 'image' ? 'image/*' : 'video/*'}
                            onChange={handleFileUpload}
                            className="hidden"
                            disabled={uploading}
                          />
                        </label>
                      </div>
                    </div>
                    <textarea
                      value={articleForm.content}
                      onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                      rows={10}
                      className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm font-mono"
                      placeholder="<p>文章内容...</p>"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800 transition-colors"
                    >
                      {editingArticle ? '保存修改' : '发布文章'}
                    </button>
                    <button
                      type="button"
                      onClick={resetArticleForm}
                      className="px-5 py-2 border border-brand-200 text-brand-600 text-sm font-medium rounded-lg hover:bg-brand-50 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Article List */}
            <div className="bg-white border border-brand-100 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-brand-50 text-brand-500">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">标题</th>
                      <th className="text-left px-4 py-3 font-medium">分类</th>
                      <th className="text-left px-4 py-3 font-medium">作者</th>
                      <th className="text-left px-4 py-3 font-medium">推荐</th>
                      <th className="text-left px-4 py-3 font-medium">阅读</th>
                      <th className="text-left px-4 py-3 font-medium">发布时间</th>
                      <th className="text-right px-4 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-50">
                    {articles.map((article) => (
                      <tr key={article.id} className="hover:bg-brand-50/50 transition-colors">
                        <td className="px-4 py-3 text-brand-900 font-medium max-w-[300px] truncate">
                          {article.title}
                        </td>
                        <td className="px-4 py-3 text-brand-500">{article.category_name}</td>
                        <td className="px-4 py-3 text-brand-500">{article.author}</td>
                        <td className="px-4 py-3">
                          {article.is_featured ? (
                            <span className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full">推荐</span>
                          ) : (
                            <span className="text-xs text-brand-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-brand-500">{article.view_count}</td>
                        <td className="px-4 py-3 text-brand-400 whitespace-nowrap">
                          {new Date(article.published_at).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditArticle(article)}
                              className="text-xs px-2 py-1 text-brand-600 hover:bg-brand-50 rounded transition-colors"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDeleteArticle(article.id)}
                              className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {articles.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-brand-400">
                          暂无文章
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Flashes Tab */}
        {activeTab === 'flashes' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-brand-900">
                快讯列表 ({flashes.length})
              </h2>
              <button
                onClick={() => setShowFlashForm(true)}
                className="px-4 py-2 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800 transition-colors"
              >
                + 新建快讯
              </button>
            </div>

            {/* Flash Form */}
            {showFlashForm && (
              <div className="bg-white border border-brand-100 rounded-xl p-6 mb-6 shadow-sm">
                <h3 className="text-base font-bold text-brand-900 mb-4">新建快讯</h3>
                <form onSubmit={handleFlashSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">标题 *</label>
                    <input
                      type="text"
                      value={flashForm.title}
                      onChange={(e) => setFlashForm({ ...flashForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">日期标签</label>
                    <input
                      type="text"
                      value={flashForm.date_label}
                      onChange={(e) => setFlashForm({ ...flashForm, date_label: e.target.value })}
                      placeholder="如：5月29日"
                      className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">内容（可选）</label>
                    <textarea
                      value={flashForm.content}
                      onChange={(e) => setFlashForm({ ...flashForm, content: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="px-5 py-2 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800 transition-colors"
                    >
                      发布快讯
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFlashForm(false);
                        setFlashForm({ title: '', content: '', date_label: '' });
                      }}
                      className="px-5 py-2 border border-brand-200 text-brand-600 text-sm font-medium rounded-lg hover:bg-brand-50 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Flash List */}
            <div className="bg-white border border-brand-100 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-brand-50 text-brand-500">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">标题</th>
                      <th className="text-left px-4 py-3 font-medium">日期</th>
                      <th className="text-left px-4 py-3 font-medium">发布时间</th>
                      <th className="text-right px-4 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-50">
                    {flashes.map((flash) => (
                      <tr key={flash.id} className="hover:bg-brand-50/50 transition-colors">
                        <td className="px-4 py-3 text-brand-900 font-medium max-w-[400px] truncate">
                          {flash.title}
                        </td>
                        <td className="px-4 py-3 text-brand-500">{flash.date_label || '-'}</td>
                        <td className="px-4 py-3 text-brand-400 whitespace-nowrap">
                          {new Date(flash.published_at).toLocaleDateString('zh-CN')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteFlash(flash.id)}
                            className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                    {flashes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-brand-400">
                          暂无快讯
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
