'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import RichEditor from '@/components/RichEditor';

interface Category { id: number; slug: string; name: string; }

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'articles' | 'flashes' | 'settings'>('articles');
  const [articles, setArticles] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const filteredArticles = articles.filter(a => statusFilter === 'all' ? true : a.status === statusFilter || (statusFilter === 'published' && !a.status));
  const [flashes, setFlashes] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ========== Article form ==========
  const [showArticleForm, setShowArticleForm] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [articleForm, setArticleForm] = useState({
    title: '', summary: '', content: '', category_id: '',
    author: '奇点编辑部', tags: '', cover_image: '',
    is_featured: false, is_exclusive: false, is_pinned: false, is_banner: false,
    published_at: '',
  });

  // ========== Flash form ==========
  const [showFlashForm, setShowFlashForm] = useState(false);
  const [flashForm, setFlashForm] = useState({ title: '', content: '', date_label: '' });

  // ========== Category add ==========
  const [showCatAdd, setShowCatAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // ========== WeChat Import ==========
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importMode, setImportMode] = useState<'url' | 'html' | 'wechat'>('wechat');
  const [importUrl, setImportUrl] = useState('');
  const [importHtml, setImportHtml] = useState('');
  const [importCategory, setImportCategory] = useState('');
  const [importing, setImporting] = useState(false);
  // 公众号同步相关
  const [wechatConfigured, setWechatConfigured] = useState<boolean | null>(null);
  const [wechatArticles, setWechatArticles] = useState<any[]>([]);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());

  // ========== Password change ==========
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwChanging, setPwChanging] = useState(false);

  // ========== WeChat Config ==========
  const [wechatConfigForm, setWechatConfigForm] = useState({ appId: '', appSecret: '' });
  const [wechatConfigSaving, setWechatConfigSaving] = useState(false);

  const loadWechatConfig = async () => {
    const res = await fetch('/api/admin/wechat-config');
    const data = await res.json();
    setWechatConfigured(!!data.data);
    if (data.data) setWechatConfigForm({ appId: data.data.app_id || '', appSecret: '' });
  };

  const saveWechatConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wechatConfigForm.appId.trim() || !wechatConfigForm.appSecret.trim()) {
      setError('请填写 AppID 和 AppSecret'); return;
    }
    setWechatConfigSaving(true);
    try {
      const res = await fetch('/api/admin/wechat-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: wechatConfigForm.appId.trim(), appSecret: wechatConfigForm.appSecret.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('公众号配置保存成功，已验证 token');
        setTimeout(() => setSuccess(''), 3000);
        setWechatConfigured(true);
        setWechatConfigForm(prev => ({ ...prev, appSecret: '' }));
      } else {
        setError(data.error);
      }
    } catch { setError('保存失败'); }
    finally { setWechatConfigSaving(false); }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [aRes, fRes, cRes] = await Promise.all([
        fetch('/api/admin/articles'), fetch('/api/admin/flashes'), fetch('/api/admin/categories')
      ]);
      if (aRes.status === 401) { router.push('/admin/login'); return; }
      const aD = await aRes.json(); if (aD.success) setArticles(aD.data);
      const fD = await fRes.json(); if (fD.success) setFlashes(fD.data);
      const cD = await cRes.json(); if (cD.success) setCategories(cD.data);
    } catch { setError('加载数据失败'); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // 打开设置页时加载公众号配置
  useEffect(() => {
    if (activeTab === 'settings') loadWechatConfig();
  }, [activeTab]);

  // ========== Category ==========
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories(prev => [...prev, data.data]);
        setArticleForm(f => ({ ...f, category_id: String(data.data.id) }));
        setNewCatName('');
        setShowCatAdd(false);
        setSuccess('分类已添加');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || '添加失败');
      }
    } catch { setError('网络错误'); }
  };

  // ========== Article CRUD ==========
  const saveArticle = async (status: 'draft' | 'published') => {
    const tags = articleForm.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5).map(t => t.length > 8 ? t.slice(0, 8) : t);
    const method = editingArticle ? 'PUT' : 'POST';
    const body: any = {
      ...articleForm, tags, status,
      category_id: parseInt(articleForm.category_id),
      is_featured: articleForm.is_featured || articleForm.is_pinned,
      is_banner: articleForm.is_banner,
    };
    if (editingArticle) body.id = editingArticle.id;

    const res = await fetch('/api/admin/articles', {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) { resetArticleForm(); fetchData(); setSuccess(status === 'draft' ? '草稿已保存' : editingArticle ? '修改成功' : '发布成功'); setTimeout(() => setSuccess(''), 2000); }
    else { setError(data.error || '操作失败'); }
  };

  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await saveArticle('published'); } catch { setError('网络错误'); }
  };

  const handleSaveDraft = async () => {
    try { await saveArticle('draft'); } catch { setError('网络错误'); }
  };

  const handleEditArticle = (article: any) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title || '', summary: article.summary || '', content: article.content || '',
      category_id: String(article.category_id || ''), author: article.author || '奇点编辑部',
      tags: (article.tags || []).join(', '), cover_image: article.cover_image || '',
      is_featured: article.is_featured || false, is_exclusive: article.is_exclusive || false,
      is_pinned: article.is_featured || false, is_banner: article.is_banner || false,
      published_at: article.published_at || '',
    });
    setShowArticleForm(true);
  };

  const resetArticleForm = () => {
    setEditingArticle(null);
    setArticleForm({ title: '', summary: '', content: '', category_id: '', author: '奇点编辑部', tags: '', cover_image: '', is_featured: false, is_exclusive: false, is_pinned: false, is_banner: false, published_at: '' });
    setShowArticleForm(false);
  };

  const handleDeleteArticle = async (id: number) => {
    if (!confirm('确定删除这篇文章？')) return;
    await fetch(`/api/admin/articles?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  // ========== WeChat Import ==========
  const handleWechatImport = async () => {
    if (!importCategory) { setError('请选择分类'); return; }
    if (importMode === 'url' && !importUrl.trim()) { setError('请粘贴公众号文章链接'); return; }
    if (importMode === 'html' && !importHtml.trim()) { setError('请粘贴公众号文章页面源码'); return; }
    setImporting(true);
    setError('');
    try {
      const body: any = { category_id: parseInt(importCategory), autoCreate: true };
      if (importMode === 'url') {
        body.url = importUrl.trim();
      } else {
        body.html = importHtml.trim();
      }
      const res = await fetch('/api/admin/import/wechat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.data.message || '导入成功');
        setTimeout(() => setSuccess(''), 3000);
        setImportUrl('');
        setImportHtml('');
        setShowImportPanel(false);
        fetchData();
      } else {
        setError(data.error || '导入失败');
      }
    } catch { setError('网络错误，请稍后重试'); }
    finally { setImporting(false); }
  };

  // ========== 公众号同步 ==========
  const checkWechatConfig = async () => {
    const res = await fetch('/api/admin/wechat-config');
    const data = await res.json();
    setWechatConfigured(!!data.data);
  };

  const fetchWechatArticles = async () => {
    setWechatLoading(true);
    try {
      const res = await fetch('/api/admin/wechat-articles');
      const data = await res.json();
      if (data.success) setWechatArticles(data.data);
      else setError(data.error);
    } catch { setError('获取公众号文章列表失败'); }
    finally { setWechatLoading(false); }
  };

  const importWechatArticle = async (mediaId: string, source: string) => {
    if (!importCategory) { setError('请先选择分类'); return; }
    setImporting(true);
    try {
      const res = await fetch('/api/admin/import/wechat-official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, source, categoryId: parseInt(importCategory) }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`导入成功：${data.data.title}`);
        setTimeout(() => setSuccess(''), 3000);
        fetchData();
        fetchWechatArticles(); // 重新拉取（可能需要从公众号列表移除）
      } else {
        setError(data.error);
      }
    } catch { setError('导入失败'); }
    finally { setImporting(false); }
  };

  const batchImportWechatArticles = async () => {
    if (!importCategory) { setError('请先选择分类'); return; }
    if (selectedArticles.size === 0) { setError('请选择要导入的文章'); return; }
    setImporting(true);
    let count = 0;
    for (const id of Array.from(selectedArticles)) {
      const article = wechatArticles.find((a: any) => a.id === id);
      if (!article) continue;
      try {
        const res = await fetch('/api/admin/import/wechat-official', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaId: article.mediaId, source: article.source, categoryId: parseInt(importCategory) }),
        });
        const data = await res.json();
        if (data.success) count++;
      } catch {}
    }
    setSelectedArticles(new Set());
    setSuccess(`批量导入完成：成功 ${count}/${selectedArticles.size} 篇`);
    setTimeout(() => setSuccess(''), 4000);
    fetchData();
    fetchWechatArticles();
    setImporting(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedArticles(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedArticles.size === wechatArticles.length) {
      setSelectedArticles(new Set());
    } else {
      setSelectedArticles(new Set(wechatArticles.map((a: any) => a.id)));
    }
  };

  // ========== Flash CRUD ==========
  const handleFlashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/flashes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(flashForm) });
      const data = await res.json();
      if (data.success) { setFlashForm({ title: '', content: '', date_label: '' }); setShowFlashForm(false); fetchData(); setSuccess('快讯发布成功'); setTimeout(() => setSuccess(''), 2000); }
      else setError(data.error || '操作失败');
    } catch { setError('网络错误'); }
  };

  const handleDeleteFlash = async (id: number) => {
    if (!confirm('确定删除？')) return;
    await fetch(`/api/admin/flashes?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  // ========== Password Change ==========
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwOld || !pwNew || !pwConfirm) { setError('请填写所有密码字段'); return; }
    if (pwNew.length < 6) { setError('新密码至少需要6个字符'); return; }
    if (pwNew !== pwConfirm) { setError('两次输入的新密码不一致'); return; }
    setPwChanging(true);
    setError('');
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: pwOld, newPassword: pwNew }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('密码修改成功，请重新登录');
        setPwOld(''); setPwNew(''); setPwConfirm('');
        setTimeout(() => router.push('/admin/login'), 2000);
      } else {
        setError(data.error || '修改失败');
      }
    } catch { setError('网络错误'); }
    finally { setPwChanging(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-brand-900 border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-brand-50">
      <header className="bg-white border-b border-brand-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-900 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs">奇</span></div>
            <h1 className="text-lg font-bold text-brand-900">管理后台</h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" target="_blank" className="text-sm text-brand-500 hover:text-brand-900">查看网站</a>
            <button onClick={async () => { await fetch('/api/auth', { method: 'DELETE' }); router.push('/admin/login'); }} className="text-sm text-red-500 hover:text-red-700">退出</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex justify-between"><span style={{whiteSpace:'pre-line'}}>{error}</span><button onClick={() => setError('')} className="ml-2 shrink-0">&times;</button></div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">{success}</div>}

        <div className="flex items-center gap-1 mb-8 bg-white rounded-lg border border-brand-100 p-1 w-fit">
          <button onClick={() => setActiveTab('articles')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'articles' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:text-brand-900'}`}>文章管理</button>
          <button onClick={() => setActiveTab('flashes')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'flashes' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:text-brand-900'}`}>快讯管理</button>
          <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'settings' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:text-brand-900'}`}>⚙ 设置</button>
        </div>

        {/* ========== ARTICLES ========== */}
        {activeTab === 'articles' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-brand-900">文章列表 ({articles.length})</h2>
              <div className="flex items-center gap-3">
                <button onClick={() => { setShowImportPanel(!showImportPanel); setShowArticleForm(false); }} className="px-4 py-2 border-2 border-green-500 text-green-600 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors">
                  📥 导入公众号文章
                </button>
                <button onClick={() => { resetArticleForm(); setShowArticleForm(true); setShowImportPanel(false); }} className="px-4 py-2 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800">+ 新建文章</button>
              </div>
            </div>

            {/* 状态筛选 */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === 'all' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:text-brand-900 bg-white border border-brand-200'}`}
              >
                全部 ({articles.length})
              </button>
              <button
                onClick={() => setStatusFilter('published')}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === 'published' ? 'bg-green-600 text-white' : 'text-green-600 hover:text-green-700 bg-white border border-green-200'}`}
              >
                已发布 ({articles.filter(a => a.status === 'published' || !a.status).length})
              </button>
              <button
                onClick={() => setStatusFilter('draft')}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${statusFilter === 'draft' ? 'bg-amber-500 text-white' : 'text-amber-600 hover:text-amber-700 bg-white border border-amber-200'}`}
              >
                📝 草稿箱 ({articles.filter(a => a.status === 'draft').length})
              </button>
            </div>

            {/* WeChat Import Panel */}
            {showImportPanel && (
              <div className="bg-white border-2 border-green-200 rounded-xl p-6 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-brand-900 flex items-center gap-2">
                    <span className="text-green-500">📥</span> 导入公众号文章
                  </h3>
                  <button onClick={() => setShowImportPanel(false)} className="text-brand-400 hover:text-brand-600 text-lg">&times;</button>
                </div>

                {/* 模式切换 */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  <button onClick={() => { setImportMode('wechat'); checkWechatConfig(); }} className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${importMode === 'wechat' ? 'bg-green-600 text-white' : 'text-green-600 bg-white border border-green-200'}`}>📡 公众号同步</button>
                  <button onClick={() => setImportMode('url')} className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${importMode === 'url' ? 'bg-green-600 text-white' : 'text-green-600 bg-white border border-green-200'}`}>🔗 链接导入</button>
                  <button onClick={() => setImportMode('html')} className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${importMode === 'html' ? 'bg-green-600 text-white' : 'text-green-600 bg-white border border-green-200'}`}>📋 粘贴 HTML</button>
                </div>

                {importMode === 'wechat' ? (
                  <div className="space-y-4">
                    {wechatConfigured === null ? (
                      <p className="text-sm text-brand-400">检查配置中...</p>
                    ) : !wechatConfigured ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                        <p className="font-medium mb-2">⚠️ 尚未配置微信公众号 API</p>
                        <p>请先前往 <button onClick={() => setActiveTab('settings')} className="text-green-600 underline font-medium">设置 → 公众号 API 配置</button>，填写你的公众号 AppID 和 AppSecret。</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-green-600">✅ 已接入公众号 API</span>
                          <button
                            onClick={fetchWechatArticles}
                            disabled={wechatLoading}
                            className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 transition-colors"
                          >
                            {wechatLoading ? '⏳ 获取中...' : '🔄 刷新文章列表'}
                          </button>
                        </div>

                        {wechatArticles.length > 0 && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-brand-700 mb-1">所属分类 *</label>
                              <select
                                value={importCategory}
                                onChange={e => setImportCategory(e.target.value)}
                                className="w-60 px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-green-500 text-sm"
                              >
                                <option value="">选择分类</option>
                                {categories.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-sm text-brand-400">共 {wechatArticles.length} 篇</span>
                              {selectedArticles.size > 0 && (
                                <button
                                  onClick={batchImportWechatArticles}
                                  disabled={importing || !importCategory}
                                  className="px-4 py-2 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800 disabled:opacity-50"
                                >
                                  {importing ? '导入中...' : `📥 批量导入 (${selectedArticles.size})`}
                                </button>
                              )}
                            </div>

                            <div className="border rounded-lg divide-y overflow-hidden max-h-[500px] overflow-y-auto" style={{borderColor:'var(--c-border)'}}>
                              {/* 全选 */}
                              <label className="flex items-center gap-3 px-4 py-2.5 bg-brand-50 text-xs font-medium cursor-pointer" style={{color:'var(--c-text-2)'}}>
                                <input type="checkbox" checked={selectedArticles.size === wechatArticles.length && wechatArticles.length > 0} onChange={toggleSelectAll} className="w-4 h-4 accent-green-600" />
                                全选
                              </label>
                              {wechatArticles.map((a: any) => (
                                <label key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-50 cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={selectedArticles.has(a.id)}
                                    onChange={() => toggleSelect(a.id)}
                                    className="w-4 h-4 accent-green-600 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate" style={{color:'var(--c-text)'}}>{a.title}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs px-1.5 py-0.5 rounded" style={{
                                        backgroundColor: a.source === 'draft' ? '#fef3c7' : '#dbeafe',
                                        color: a.source === 'draft' ? '#92400e' : '#1e40af',
                                      }}>
                                        {a.source === 'draft' ? '草稿箱' : '已发布'}
                                      </span>
                                      {a.pubTime && <span className="text-xs text-brand-400">{new Date(a.pubTime).toLocaleDateString('zh-CN')}</span>}
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); importWechatArticle(a.mediaId, a.source); }}
                                    disabled={importing || !importCategory}
                                    className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 shrink-0"
                                  >
                                    导入
                                  </button>
                                </label>
                              ))}
                            </div>
                          </>
                        )}

                        {!wechatLoading && wechatArticles.length === 0 && (
                          <p className="text-sm text-brand-400 py-8 text-center">暂无草稿或已发布文章，请先在公众号后台发布。</p>
                        )}
                      </>
                    )}
                  </div>
                ) : importMode === 'url' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-brand-500">粘贴公众号文章链接，服务端自动抓取（若抓取失败请使用「粘贴 HTML 源码」模式）。</p>
                    <div>
                      <label className="block text-sm font-medium text-brand-700 mb-1">文章链接 *</label>
                      <input
                        type="url"
                        value={importUrl}
                        onChange={e => setImportUrl(e.target.value)}
                        placeholder="https://mp.weixin.qq.com/s/..."
                        className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-green-500 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-700 mb-1">所属分类 *</label>
                      <select
                        value={importCategory}
                        onChange={e => setImportCategory(e.target.value)}
                        className="w-60 px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-green-500 text-sm"
                      >
                        <option value="">选择分类</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleWechatImport}
                        disabled={importing}
                        className={`px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg transition-colors ${importing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                      >
                        {importing ? '⏳ 正在抓取...' : '📥 开始导入'}
                      </button>
                      <button onClick={() => setShowImportPanel(false)} className="px-4 py-2.5 border border-brand-200 text-brand-600 text-sm rounded-lg hover:bg-brand-50">取消</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                      <p className="font-medium mb-1">📋 如何使用「粘贴 HTML 源码」模式：</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>在浏览器中打开公众号文章链接</li>
                        <li>右键 → <code className="bg-amber-100 px-1 rounded">查看网页源代码</code></li>
                        <li><code className="bg-amber-100 px-1 rounded">Ctrl+A</code> 全选 → <code className="bg-amber-100 px-1 rounded">Ctrl+C</code> 复制</li>
                        <li>回到本页面，粘贴到下方文本框</li>
                        <li>选择分类，点击「导入」</li>
                      </ol>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-700 mb-1">页面源码 *</label>
                      <textarea
                        value={importHtml}
                        onChange={e => setImportHtml(e.target.value)}
                        placeholder="粘贴公众号文章页面源码（右键 → 查看网页源代码 → 全选复制）"
                        rows={10}
                        className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-green-500 text-xs font-mono resize-y"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-700 mb-1">所属分类 *</label>
                      <select
                        value={importCategory}
                        onChange={e => setImportCategory(e.target.value)}
                        className="w-60 px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-green-500 text-sm"
                      >
                        <option value="">选择分类</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleWechatImport}
                        disabled={importing}
                        className={`px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg transition-colors ${importing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                      >
                        {importing ? '⏳ 正在解析...' : '📥 导入'}
                      </button>
                      <button onClick={() => setShowImportPanel(false)} className="px-4 py-2.5 border border-brand-200 text-brand-600 text-sm rounded-lg hover:bg-brand-50">取消</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {showArticleForm && (
              <div className="bg-white border border-brand-100 rounded-xl p-6 mb-6 shadow-sm">
                <h3 className="text-base font-bold text-brand-900 mb-4">{editingArticle ? '编辑文章' : '新建文章'}</h3>
                <form onSubmit={handleArticleSubmit} className="space-y-5">
                  {/* Title & Summary */}
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">标题 *</label>
                    <input type="text" value={articleForm.title} onChange={e => setArticleForm({...articleForm, title: e.target.value})} className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">摘要</label>
                    <textarea value={articleForm.summary} onChange={e => setArticleForm({...articleForm, summary: e.target.value})} rows={2} className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm resize-none" />
                  </div>

                  {/* Category + Author row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-brand-700 mb-1">分类 *</label>
                      <div className="flex gap-2">
                        <select value={articleForm.category_id} onChange={e => setArticleForm({...articleForm, category_id: e.target.value})} className="flex-1 px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm" required>
                          <option value="">选择分类</option>
                          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                        <button type="button" onClick={() => setShowCatAdd(!showCatAdd)} className="px-3 py-2.5 border border-brand-200 rounded-lg text-sm text-brand-500 hover:bg-brand-50 whitespace-nowrap">+ 新增</button>
                      </div>
                      {showCatAdd && (
                        <div className="flex gap-2 mt-2">
                          <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="分类名称" className="flex-1 px-3 py-2 border border-brand-200 rounded-lg text-sm focus:outline-none focus:border-brand-900" />
                          <button type="button" onClick={handleAddCategory} className="px-4 py-2 bg-brand-900 text-white text-xs rounded-lg hover:bg-brand-800">确认</button>
                          <button type="button" onClick={() => setShowCatAdd(false)} className="px-3 py-2 border border-brand-200 text-xs rounded-lg hover:bg-brand-50">取消</button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-700 mb-1">作者</label>
                      <input type="text" value={articleForm.author} onChange={e => setArticleForm({...articleForm, author: e.target.value})} className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm" />
                    </div>
                  </div>

                  {/* Tags + Cover */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-brand-700 mb-1">标签（逗号分隔）</label>
                      <input type="text" value={articleForm.tags} onChange={e => setArticleForm({...articleForm, tags: e.target.value})} placeholder="AI, 大模型" className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-brand-700 mb-1">封面图片</label>
                      <div className="flex gap-2">
                        <input type="text" value={articleForm.cover_image} onChange={e => setArticleForm({...articleForm, cover_image: e.target.value})} placeholder="粘贴URL或上传图片" className="flex-1 px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm" />
                        <label className={`px-3 py-2.5 border border-brand-200 rounded-lg text-xs hover:bg-brand-50 cursor-pointer whitespace-nowrap flex items-center gap-1 transition-colors ${uploading ? 'text-brand-300 pointer-events-none' : 'text-brand-500'}`}>
                          {uploading ? '⏳ 上传中...' : '📷 本地上传'}
                          <input type="file" accept="image/*" onChange={async (e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            setUploading(true);
                            try {
                              const fd = new FormData(); fd.append('file', file);
                              const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
                              const data = await res.json();
                              if (data.success) setArticleForm(f => ({...f, cover_image: data.data.url}));
                              else setError(data.error || '上传失败');
                            } catch { setError('上传失败'); }
                            finally { setUploading(false); }
                          }} className="hidden" disabled={uploading} />
                        </label>
                      </div>
                      {articleForm.cover_image && (
                        <div className="mt-2 relative inline-block">
                          <img src={articleForm.cover_image} alt="封面预览" className="h-20 rounded-lg border border-brand-200" />
                          <button type="button" onClick={() => setArticleForm(f => ({...f, cover_image: ''}))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">✕</button>
                        </div>
                      )}
                      <p className="text-xs text-brand-400 mt-1">留空则自动提取文章第一张图片</p>
                    </div>
                  </div>

                  {/* 精选 + 独家 + 置顶 toggles */}
                  <div className="flex flex-wrap items-center gap-4 p-4 bg-amber-50/50 border border-amber-100 rounded-lg">
                    <label className="flex items-center gap-2 text-sm text-brand-700 cursor-pointer">
                      <input type="checkbox" checked={articleForm.is_pinned} onChange={e => setArticleForm({...articleForm, is_pinned: e.target.checked, is_featured: e.target.checked})} className="rounded border-brand-300 w-4 h-4 accent-amber-500" />
                      <span className="font-medium">⭐ 精选推荐</span>
                      <span className="text-xs text-brand-400">（显示在首页推荐位）</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-brand-700 cursor-pointer">
                      <input type="checkbox" checked={articleForm.is_exclusive} onChange={e => setArticleForm({...articleForm, is_exclusive: e.target.checked})} className="rounded border-brand-300 w-4 h-4 accent-red-500" />
                      <span className="font-medium">🔴 独家标记</span>
                      <span className="text-xs text-brand-400">（显示独家标签）</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-brand-700 cursor-pointer">
                      <input type="checkbox" checked={articleForm.is_banner} onChange={e => setArticleForm({...articleForm, is_banner: e.target.checked})} className="rounded border-brand-300 w-4 h-4 accent-blue-500" />
                      <span className="font-medium">🎬 首页Banner</span>
                      <span className="text-xs text-brand-400">（最多显示5个，前端展示前3个）</span>
                    </label>
                  </div>

                  {/* 发布时间 */}
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">发布时间</label>
                    <input type="datetime-local"
                      value={articleForm.published_at ? new Date(new Date(articleForm.published_at).getTime() - new Date(articleForm.published_at).getTimezoneOffset()*60000).toISOString().slice(0,16) : ''}
                      onChange={e => setArticleForm({...articleForm, published_at: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                      className="w-60 px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm" />
                    <p className="text-xs text-brand-400 mt-1">留空则使用当前时间</p>
                  </div>

                  {/* Rich Text Editor */}
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">正文内容</label>
                    <p className="text-xs text-brand-400 mb-2">支持直接粘贴文章（含图片、格式），选中文字可使用工具栏调整样式</p>
                    <RichEditor
                      value={articleForm.content}
                      onChange={(html) => setArticleForm({...articleForm, content: html})}
                      placeholder="在此粘贴文章内容，支持图文混排..."
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button type="submit" className="px-6 py-2.5 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800">{editingArticle ? '保存修改' : '发布文章'}</button>
                    <button type="button" onClick={handleSaveDraft} className="px-6 py-2.5 border-2 border-brand-200 text-brand-600 text-sm font-medium rounded-lg hover:border-brand-900 hover:text-brand-900 transition-colors">💾 保存草稿</button>
                    <button type="button" onClick={resetArticleForm} className="px-5 py-2.5 border border-brand-200 text-brand-600 text-sm rounded-lg hover:bg-brand-50">取消</button>
                  </div>
                </form>
              </div>
            )}

            {/* Article Table */}
            <div className="bg-white border border-brand-100 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-brand-50 text-brand-500">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">标题</th>
                        <th className="text-left px-4 py-3 font-medium">分类</th>
                        <th className="text-center px-4 py-3 font-medium w-16">精选</th>
                        <th className="text-center px-4 py-3 font-medium w-16">Banner</th>
                        <th className="text-center px-4 py-3 font-medium w-16">状态</th>
                        <th className="text-left px-4 py-3 font-medium">阅读</th>
                        <th className="text-left px-4 py-3 font-medium">时间</th>
                        <th className="text-right px-4 py-3 font-medium">操作</th>
                      </tr>
                    </thead>
                  <tbody className="divide-y divide-brand-50">
                    {filteredArticles.map(a => (
                      <tr key={a.id} className="hover:bg-brand-50/50">
                        <td className="px-4 py-3 text-brand-900 font-medium max-w-[300px] truncate">{a.title}</td>
                        <td className="px-4 py-3 text-brand-500">{a.category_name}</td>
                        <td className="px-4 py-3 text-center">{a.is_featured ? <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">精选</span> : <span className="text-brand-300">-</span>}</td>
                        <td className="px-4 py-3 text-center">{a.is_banner ? <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">🎬 Banner</span> : <span className="text-brand-300">-</span>}</td>
                        <td className="px-4 py-3 text-center">{a.status === 'draft' ? <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">草稿</span> : <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">已发布</span>}</td>
                        <td className="px-4 py-3 text-brand-500">{a.view_count}</td>
                        <td className="px-4 py-3 text-brand-400 whitespace-nowrap text-xs">{new Date(a.published_at).toLocaleDateString('zh-CN')}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEditArticle(a)} className="text-xs px-2 py-1 text-brand-600 hover:bg-brand-50 rounded mr-1">编辑</button>
                          <button onClick={() => handleDeleteArticle(a.id)} className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded">删除</button>
                        </td>
                      </tr>
                    ))}
                    {filteredArticles.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-brand-400">{statusFilter === 'draft' ? '草稿箱为空' : '暂无文章'}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========== FLASHES ========== */}
        {activeTab === 'flashes' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-brand-900">快讯列表 ({flashes.length})</h2>
              <button onClick={() => setShowFlashForm(true)} className="px-4 py-2 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800">+ 新建快讯</button>
            </div>
            {showFlashForm && (
              <div className="bg-white border border-brand-100 rounded-xl p-6 mb-6 shadow-sm">
                <h3 className="text-base font-bold text-brand-900 mb-4">新建快讯</h3>
                <form onSubmit={handleFlashSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">标题 *</label>
                    <input type="text" value={flashForm.title} onChange={e => setFlashForm({...flashForm, title: e.target.value})} className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">日期标签</label>
                    <input type="text" value={flashForm.date_label} onChange={e => setFlashForm({...flashForm, date_label: e.target.value})} placeholder="如：5月29日" className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">内容（支持粘贴图文）</label>
                    <RichEditor
                      value={flashForm.content}
                      onChange={(html) => setFlashForm({...flashForm, content: html})}
                      placeholder="在此输入内容，支持粘贴带图片的文章..."
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="submit" className="px-5 py-2 bg-brand-900 text-white text-sm rounded-lg hover:bg-brand-800">发布快讯</button>
                    <button type="button" onClick={() => { setShowFlashForm(false); setFlashForm({ title: '', content: '', date_label: '' }); }} className="px-5 py-2 border border-brand-200 text-brand-600 text-sm rounded-lg hover:bg-brand-50">取消</button>
                  </div>
                </form>
              </div>
            )}
            <div className="bg-white border border-brand-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-brand-50 text-brand-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">标题</th>
                    <th className="text-left px-4 py-3 font-medium">日期</th>
                    <th className="text-left px-4 py-3 font-medium">时间</th>
                    <th className="text-right px-4 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {flashes.map(f => (
                    <tr key={f.id} className="hover:bg-brand-50/50">
                      <td className="px-4 py-3 text-brand-900 font-medium max-w-[400px] truncate">{f.title}</td>
                      <td className="px-4 py-3 text-brand-500">{f.date_label || '-'}</td>
                      <td className="px-4 py-3 text-brand-400 text-xs">{new Date(f.published_at).toLocaleDateString('zh-CN')}</td>
                      <td className="px-4 py-3 text-right"><button onClick={() => handleDeleteFlash(f.id)} className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded">删除</button></td>
                    </tr>
                  ))}
                  {flashes.length === 0 && <tr><td colSpan={4} className="px-4 py-12 text-center text-brand-400">暂无快讯</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========== SETTINGS ========== */}
        {activeTab === 'settings' && (
          <div>
            <div className="max-w-lg">
              {/* Password Change */}
              <div className="bg-white border border-brand-100 rounded-xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-brand-900 mb-1">修改密码</h3>
                <p className="text-sm text-brand-400 mb-6">修改管理员登录密码，修改后需要重新登录。</p>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">当前密码</label>
                    <input
                      type="password"
                      value={pwOld}
                      onChange={e => setPwOld(e.target.value)}
                      className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">新密码</label>
                    <input
                      type="password"
                      value={pwNew}
                      onChange={e => setPwNew(e.target.value)}
                      className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                      required
                      minLength={6}
                      placeholder="至少6个字符"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">确认新密码</label>
                    <input
                      type="password"
                      value={pwConfirm}
                      onChange={e => setPwConfirm(e.target.value)}
                      className="w-full px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                      required
                      minLength={6}
                      placeholder="再次输入新密码"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={pwChanging}
                      className={`px-6 py-2.5 bg-brand-900 text-white text-sm font-medium rounded-lg transition-colors ${pwChanging ? 'opacity-50 cursor-not-allowed' : 'hover:bg-brand-800'}`}
                    >
                      {pwChanging ? '修改中...' : '修改密码'}
                    </button>
                  </div>
                </form>
              </div>

              {/* WeChat API Config */}
              <div className="bg-white border border-brand-100 rounded-xl p-6 shadow-sm mt-6">
                <h3 className="text-base font-bold text-brand-900 mb-1">📡 微信公众号 API 配置</h3>
                <p className="text-sm text-brand-400 mb-6">
                  配置你自己的微信公众号 AppID 和 AppSecret，即可在文章管理中一键同步公众号草稿箱和已发布文章。
                  <br/>
                  <span style={{color:'var(--c-text-3)'}}>如何获取？前往 </span>
                  <a href="https://mp.weixin.qq.com/" target="_blank" rel="noopener" className="text-green-600 underline">微信公众平台</a>
                  <span style={{color:'var(--c-text-3)'}}> → 设置与开发 → 基本配置 → 开发者ID(AppID) / 开发者密码(AppSecret)</span>
                </p>
                <form onSubmit={saveWechatConfig} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">AppID（开发者ID）</label>
                    <input
                      type="text"
                      value={wechatConfigForm.appId}
                      onChange={e => setWechatConfigForm(prev => ({ ...prev, appId: e.target.value }))}
                      className="w-full max-w-md px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-green-500 text-sm font-mono"
                      placeholder="wx0000000000000000"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">AppSecret（开发者密码）</label>
                    <input
                      type="password"
                      value={wechatConfigForm.appSecret}
                      onChange={e => setWechatConfigForm(prev => ({ ...prev, appSecret: e.target.value }))}
                      className="w-full max-w-md px-4 py-2.5 border border-brand-200 rounded-lg focus:outline-none focus:border-green-500 text-sm font-mono"
                      placeholder={wechatConfigured ? '留空则保留当前密码' : '请输入 AppSecret'}
                      required={!wechatConfigured}
                    />
                  </div>
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={wechatConfigSaving}
                      className={`px-6 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg transition-colors ${wechatConfigSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                    >
                      {wechatConfigSaving ? '验证中...' : (wechatConfigured ? '更新配置' : '保存并验证')}
                    </button>
                    {wechatConfigured && <span className="text-sm text-green-600">✅ 已配置</span>}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
