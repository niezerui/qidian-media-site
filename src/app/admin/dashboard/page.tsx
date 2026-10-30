'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import RichEditor from '@/components/RichEditor';
import CommentManager from '@/components/admin/CommentManager';
import UserManager from '@/components/admin/UserManager';

interface Category { id: number; slug: string; name: string; sort_order?: number | null; article_count?: number; }

// 通知其它标签页（前台导航）刷新分类；BroadcastChannel 不可用时静默忽略
function notifyNavChanged() {
  try {
    const bc = new BroadcastChannel('qidian-nav');
    bc.postMessage({ type: 'nav-updated', at: Date.now() });
    bc.close();
  } catch { /* 忽略 */ }
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'articles' | 'categories' | 'flashes' | 'comments' | 'users' | 'settings'>('articles');
  const [articles, setArticles] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  // 分页与统计（服务端驱动）
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [counts, setCounts] = useState({ total: 0, published: 0, draft: 0, featured: 0, banner: 0 });
  const PAGE_SIZE = 20;
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
  const [flashSourceFilter, setFlashSourceFilter] = useState<string>('all');
  const [flashSelected, setFlashSelected] = useState<Set<number>>(new Set());
  const [flashAutoStats, setFlashAutoStats] = useState<{ totalAuto: number; lastAutoTime: string | null; sources: { source: string; count: number }[] } | null>(null);

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

  // ========== Toast ==========
  const [toast, setToast] = useState<{ msg: string; type?: 'success' | 'error' | 'warning' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ========== Password change ==========
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwChanging, setPwChanging] = useState(false);
  const [showPwOld, setShowPwOld] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

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

  const fetchData = useCallback(async (targetPage = 1, status: 'all' | 'published' | 'draft' = 'all') => {
    try {
      setLoading(true);
      const qs = `page=${targetPage}&pageSize=20${status !== 'all' ? `&status=${status}` : ''}`;
      const [aRes, fRes, cRes] = await Promise.all([
        fetch(`/api/admin/articles?${qs}`), fetch('/api/admin/flashes'), fetch('/api/admin/categories')
      ]);
      if (aRes.status === 401) { router.push('/admin/login'); return; }
      const aD = await aRes.json();
      if (aD.success) {
        setArticles(aD.data);
        setTotal(aD.total || 0);
        setTotalPages(Math.max(1, aD.totalPages || 1));
        if (aD.counts) setCounts(aD.counts);
        // 当前页超出总页数时（如删光本页末条）回退到最后一页
        if (aD.totalPages && targetPage > aD.totalPages && aD.totalPages >= 1 && aD.data.length === 0) {
          setPage(Math.max(1, aD.totalPages));
          return fetchData(Math.max(1, aD.totalPages), status);
        }
      }
      const fD = await fRes.json(); if (fD.success) setFlashes(fD.data);
      const cD = await cRes.json(); if (cD.success) setCategories(cD.data);
    } catch { setError('加载数据失败'); }
    finally { setLoading(false); }
  }, [router]);

  // 重新加载当前页
  const reloadArticles = useCallback(() => {
    fetchData(page, statusFilter);
  }, [fetchData, page, statusFilter]);

  useEffect(() => { fetchData(1, 'all'); }, [fetchData]);

  // 切换状态筛选（回到第 1 页）
  const changeStatusFilter = (s: 'all' | 'published' | 'draft') => {
    setStatusFilter(s);
    setPage(1);
    fetchData(1, s);
  };

  const goPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
    fetchData(p, statusFilter);
  };

  // 页码窗口：始终含首页/末页，最多展示当前页前后共 7 个数字，中间用省略号
  const pageNumbers = (() => {
    const s = new Set<number>([1, totalPages]);
    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) s.add(i);
    return Array.from(s).sort((a, b) => a - b);
  })();

  // 打开设置页时加载公众号配置
  useEffect(() => {
    if (activeTab === 'settings') loadWechatConfig();
  }, [activeTab]);

  // 打开快讯页时加载自动抓取统计
  useEffect(() => {
    if (activeTab === 'flashes') {
      fetch('/api/admin/flashes/auto-import', { headers: { 'x-auto-import-key': 'qidian-flash-auto-2026-secure' } })
        .then(r => r.json())
        .then(d => { if (d.success) setFlashAutoStats(d); })
        .catch(() => {});
    }
  }, [activeTab]);

  // ========== Category ==========
  const [catEditing, setCatEditing] = useState<{ id: number; name: string } | null>(null);
  const [catSaving, setCatSaving] = useState(false);
  const [newCatNameTab, setNewCatNameTab] = useState('');
  // 导航顺序：本地草稿 vs 已保存（不一致时提示保存）
  const [catOrder, setCatOrder] = useState<number[]>([]);
  const [savedOrder, setSavedOrder] = useState<number[]>([]);
  // 删除确认（分类下有文章时需选择转移目标）
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [moveTo, setMoveTo] = useState('');

  // 分类集合变化（新增/删除/重新拉取）时同步顺序草稿；仅顺序被本地调整时保留用户排列
  useEffect(() => {
    const ids = categories.map(c => c.id);
    const sameSet = ids.length > 0 && ids.length === catOrder.length &&
      [...ids].sort((a, b) => a - b).join(',') === [...catOrder].sort((a, b) => a - b).join(',');
    if (sameSet) return;
    setCatOrder(ids);
    setSavedOrder(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const orderDirty = catOrder.length > 0 && catOrder.join(',') !== savedOrder.join(',');

  // 上移 / 下移
  const moveCat = (idx: number, dir: -1 | 1) => {
    setCatOrder(prev => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  // 保存导航顺序（确认后立即写入数据库并推送前台）
  const handleSaveOrder = async () => {
    if (!orderDirty) return;
    setCatSaving(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: catOrder }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedOrder(catOrder);
        // 本地同步 categories 顺序，保证文章表单等处的分类下拉一致
        setCategories(prev => {
          const map = new Map(prev.map(c => [c.id, c]));
          return catOrder.map(id => map.get(id)).filter(Boolean) as Category[];
        });
        notifyNavChanged();
        setSuccess('导航顺序已保存，前台已同步更新');
        setTimeout(() => setSuccess(''), 2500);
      } else {
        setError(data.error || '保存顺序失败');
      }
    } catch { setError('网络错误'); }
    finally { setCatSaving(false); }
  };

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
        notifyNavChanged();
        setSuccess('分类已添加');
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(data.error || '添加失败');
      }
    } catch { setError('网络错误'); }
  };

  // 分类管理页签：新增（不联动文章表单）
  const handleAddCategoryTab = async () => {
    if (!newCatNameTab.trim()) return;
    setCatSaving(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatNameTab.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories(prev => [...prev, data.data]);
        setNewCatNameTab('');
        notifyNavChanged();
        setSuccess('分类已添加，前台导航栏已同步展示');
        setTimeout(() => setSuccess(''), 2500);
      } else {
        setError(data.error || '添加失败');
      }
    } catch { setError('网络错误'); }
    finally { setCatSaving(false); }
  };

  // 分类管理页签：重命名
  const handleRenameCategory = async () => {
    if (!catEditing || !catEditing.name.trim()) return;
    setCatSaving(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: catEditing.id, name: catEditing.name.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        const newName = catEditing.name.trim();
        setCategories(prev => prev.map(c => c.id === catEditing.id ? { ...c, name: newName } : c));
        setCatEditing(null);
        notifyNavChanged();
        setSuccess('分类已更新，前台导航栏已同步显示新名称');
        setTimeout(() => setSuccess(''), 2500);
      } else {
        setError(data.error || '修改失败');
      }
    } catch { setError('网络错误'); }
    finally { setCatSaving(false); }
  };

  // 分类管理页签：点击删除 → 打开确认弹窗（有文章时需选转移目标）
  const handleDeleteCategory = (cat: Category) => {
    if (categories.length <= 1) {
      setError('至少要保留一个分类，无法删除最后一个分类');
      setTimeout(() => setError(''), 2500);
      return;
    }
    setMoveTo('');
    setDeleteTarget(cat);
  };

  // 分类管理页签：确认删除
  const confirmDeleteCategory = async () => {
    if (!deleteTarget) return;
    const count = deleteTarget.article_count ?? 0;
    if (count > 0 && !moveTo) {
      setError('请选择文章要转移到的分类');
      return;
    }
    setCatSaving(true);
    try {
      const qs = count > 0 ? `?id=${deleteTarget.id}&moveTo=${moveTo}` : `?id=${deleteTarget.id}`;
      const res = await fetch(`/api/admin/categories${qs}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCategories(prev => prev.filter(c => c.id !== deleteTarget.id));
        notifyNavChanged();
        setSuccess(data.message || '分类已删除');
        setTimeout(() => setSuccess(''), 3000);
        setDeleteTarget(null);
        // 重新拉取，保证文章列表/分类下拉与数据库一致
        fetchData(page, statusFilter);
      } else {
        setError(data.error || '删除失败');
      }
    } catch { setError('网络错误'); }
    finally { setCatSaving(false); }
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

    const payload = JSON.stringify(body);
    // 前端体积预检：服务器（Vercel）单次请求体上限约 4.5MB，提前给出可操作提示
    if (payload.length > 3_900_000) {
      setError('内容过大：内嵌图片较多，保存体积接近服务器上限（4.5MB）。建议删除部分大图，或删除后重新上传（超过 2.5MB 的图片/视频会自动存到对象存储，不占用正文体积）再保存。');
      return;
    }

    let res: Response;
    try {
      res = await fetch('/api/admin/articles', {
        method, headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
    } catch {
      setError('网络错误，请重试');
      return;
    }

    let data: any = null;
    try { data = await res.json(); } catch { /* 413/网关错误等非 JSON 响应 */ }
    if (!data) {
      setError(res.status === 413 ? '内容过大：服务器拒绝了本次保存（超过 4.5MB 上限）。请压缩图片后重试。' : `服务器异常（HTTP ${res.status}），请稍后重试`);
      return;
    }
    if (data.success) { resetArticleForm(); reloadArticles(); setSuccess(status === 'draft' ? '草稿已保存' : editingArticle ? '修改成功' : '发布成功'); setTimeout(() => setSuccess(''), 2000); }
    else { setError(data.error || '操作失败'); }
  };

  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await saveArticle('published'); } catch { setError('网络错误'); }
  };

  const handleSaveDraft = async () => {
    try { await saveArticle('draft'); } catch { setError('网络错误'); }
  };

  // 编辑：列表已不含 content 大字段，先按 id 拉取完整文章再填入表单
  const handleEditArticle = async (article: any) => {
    setEditingArticle(article);
    setArticleForm({
      title: article.title || '', summary: article.summary || '', content: '',
      category_id: String(article.category_id || ''), author: article.author || '奇点编辑部',
      tags: (article.tags || []).join(', '), cover_image: article.cover_image || '',
      is_featured: article.is_featured || false, is_exclusive: article.is_exclusive || false,
      is_pinned: article.is_featured || false, is_banner: article.is_banner || false,
      published_at: article.published_at || '',
    });
    setShowArticleForm(true);
    try {
      const res = await fetch(`/api/admin/articles?id=${article.id}`);
      let data: any = null;
      try { data = await res.json(); } catch { /* ignore */ }
      if (res.ok && data?.success && data.data) {
        const a = data.data;
        setArticleForm(f => ({
          ...f,
          title: a.title || f.title,
          summary: a.summary || '',
          content: a.content || '',
          cover_image: a.cover_image || '',
        }));
      } else {
        setError('正文加载失败，请重试');
      }
    } catch { setError('正文加载失败，请重试'); }
  };

  const resetArticleForm = () => {
    setEditingArticle(null);
    setArticleForm({ title: '', summary: '', content: '', category_id: '', author: '奇点编辑部', tags: '', cover_image: '', is_featured: false, is_exclusive: false, is_pinned: false, is_banner: false, published_at: '' });
    setShowArticleForm(false);
  };

  const handleDeleteArticle = async (id: number) => {
    if (!confirm('确定删除这篇文章？')) return;
    await fetch(`/api/admin/articles?id=${id}`, { method: 'DELETE' });
    reloadArticles();
  };

  const handleToggleBanner = async (article: any) => {
    const currentBannerCount = (counts?.banner ?? 0) - (article.is_banner ? 1 : 0);
    if (!article.is_banner && currentBannerCount >= 5) {
      showToast('Banner 最多设置 5 个，请先取消其他文章的 Banner', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/admin/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: article.id, is_banner: !article.is_banner }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(article.is_banner ? '已取消 Banner' : '已设为 Banner');
        reloadArticles();
      } else {
        showToast(data.error || '操作失败', 'error');
      }
    } catch {
      showToast('网络错误', 'error');
    }
  };

  const handleToggleFeatured = async (article: any) => {
    // 精选只在 Banner 右侧展示 3 个，这里限制最多 4 个避免溢出
    const currentFeaturedCount = (counts?.featured ?? 0) - (article.is_featured ? 1 : 0);
    if (!article.is_featured && currentFeaturedCount >= 4) {
      showToast('精选最多设置 4 个（首页右侧展示前 3 个），请先取消其他文章的精选', 'warning');
      return;
    }
    try {
      const res = await fetch('/api/admin/articles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: article.id, is_featured: !article.is_featured }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(article.is_featured ? '已取消精选' : '已设为精选');
        reloadArticles();
      } else {
        showToast(data.error || '操作失败', 'error');
      }
    } catch {
      showToast('网络错误', 'error');
    }
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
        reloadArticles();
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
        reloadArticles();
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
    reloadArticles();
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
      if (data.success) { setFlashForm({ title: '', content: '', date_label: '' }); setShowFlashForm(false); reloadArticles(); setSuccess('快讯发布成功'); setTimeout(() => setSuccess(''), 2000); }
      else setError(data.error || '操作失败');
    } catch { setError('网络错误'); }
  };

  const handleDeleteFlash = async (id: number) => {
    if (!confirm('确定删除？')) return;
    await fetch(`/api/admin/flashes?id=${id}`, { method: 'DELETE' });
    reloadArticles();
  };

  const handleBatchDeleteFlash = async () => {
    if (flashSelected.size === 0) return;
    if (!confirm(`确定批量删除 ${flashSelected.size} 条快讯？`)) return;
    const ids = Array.from(flashSelected);
    for (const id of ids) {
      await fetch(`/api/admin/flashes?id=${id}`, { method: 'DELETE' });
    }
    setFlashSelected(new Set());
    reloadArticles();
    showToast(`已删除 ${ids.length} 条快讯`);
  };

  const toggleFlashSelect = (id: number) => {
    setFlashSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredFlashes = flashes.filter(f => {
    if (flashSourceFilter === 'all') return true;
    if (flashSourceFilter === 'auto') return f.is_auto === 1;
    if (flashSourceFilter === 'manual') return !f.is_auto || f.is_auto === 0;
    return f.source === flashSourceFilter;
  });

  const flashSources = Array.from(new Set(flashes.map(f => f.source).filter(Boolean)));

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

      {/* Toast 浮层 */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 transition-all animate-fade-in
          ${toast.type === 'warning' ? 'bg-amber-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-brand-900 text-white'}`}>
          {toast.type === 'warning' ? '⚠️' : toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex justify-between"><span style={{whiteSpace:'pre-line'}}>{error}</span><button onClick={() => setError('')} className="ml-2 shrink-0">&times;</button></div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">{success}</div>}

        <div className="flex items-center gap-1 mb-8 bg-white rounded-lg border border-brand-100 p-1 w-fit">
          <button onClick={() => setActiveTab('articles')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'articles' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:text-brand-900'}`}>文章管理</button>
          <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'categories' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:text-brand-900'}`}>🗂 分类管理</button>
          <button onClick={() => setActiveTab('flashes')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'flashes' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:text-brand-900'}`}>快讯管理</button>
          <button onClick={() => setActiveTab('comments')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'comments' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:text-brand-900'}`}>💬 评论管理</button>
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'users' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:text-brand-900'}`}>👥 用户管理</button>
          <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'settings' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:text-brand-900'}`}>⚙ 设置</button>
        </div>

        {/* ========== CATEGORIES ========== */}
        {activeTab === 'categories' && (
          <div className="bg-white border border-brand-100 rounded-xl p-6 shadow-sm max-w-2xl">
            <h2 className="text-lg font-bold text-brand-900 mb-1">分类管理（网站导航）</h2>
            <p className="text-xs text-brand-400 mb-5">
              新增 / 重命名 / 调整顺序都会同步到前台导航栏和页脚；删除有文章的分类时，需要先选择文章要转移到的分类，确保不会有文章失去归属。
            </p>

            {/* 新增 */}
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={newCatNameTab}
                onChange={e => setNewCatNameTab(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCategoryTab(); }}
                placeholder="输入新分类名称（最多20字）"
                maxLength={20}
                className="flex-1 px-4 py-2.5 border border-brand-200 rounded-lg text-sm focus:outline-none focus:border-brand-900"
              />
              <button
                onClick={handleAddCategoryTab}
                disabled={catSaving || !newCatNameTab.trim()}
                className="px-5 py-2.5 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                + 新增分类
              </button>
            </div>

            {/* 排序提示 */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs text-brand-400">
                共 {categories.length} 个分类 · 用 ↑↓ 调整前台导航的显示顺序
              </span>
              {orderDirty && <span className="text-xs font-medium text-amber-600">顺序已改动，记得保存</span>}
            </div>

            {/* 分类列表（按当前草稿顺序展示） */}
            <div className="border border-brand-100 rounded-lg divide-y divide-brand-50">
              {categories.length === 0 && (
                <p className="px-4 py-6 text-sm text-brand-400 text-center">暂无分类</p>
              )}
              {catOrder.map((cid, idx) => {
                const cat = categories.find(c => c.id === cid);
                if (!cat) return null;
                const cnt = cat.article_count ?? 0;
                return (
                  <div key={cat.id} className="flex items-center gap-2 px-3 py-3">
                    {/* 序号 */}
                    <span className="w-5 shrink-0 text-center text-xs text-brand-300" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                      {idx + 1}
                    </span>
                    {/* 上移 / 下移 */}
                    <div className="shrink-0 flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveCat(idx, -1)}
                        disabled={idx === 0}
                        aria-label={`将「${cat.name}」上移`}
                        title="上移"
                        className="w-6 h-[18px] flex items-center justify-center border border-brand-200 rounded-t text-brand-500 hover:border-brand-900 hover:text-brand-900 hover:bg-brand-50 transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCat(idx, 1)}
                        disabled={idx === catOrder.length - 1}
                        aria-label={`将「${cat.name}」下移`}
                        title="下移"
                        className="w-6 h-[18px] flex items-center justify-center border border-t-0 border-brand-200 rounded-b text-brand-500 hover:border-brand-900 hover:text-brand-900 hover:bg-brand-50 transition-colors disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>

                    {catEditing?.id === cat.id ? (
                      <>
                        <input
                          autoFocus
                          type="text"
                          value={catEditing.name}
                          maxLength={20}
                          onChange={e => setCatEditing({ ...catEditing, name: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') handleRenameCategory(); }}
                          className="flex-1 px-3 py-1.5 border border-brand-200 rounded-lg text-sm focus:outline-none focus:border-brand-900"
                        />
                        <button
                          onClick={handleRenameCategory}
                          disabled={catSaving || !catEditing.name.trim()}
                          className="px-3 py-1.5 bg-brand-900 text-white text-xs rounded-lg hover:bg-brand-800 disabled:opacity-40 whitespace-nowrap"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setCatEditing(null)}
                          className="px-3 py-1.5 border border-brand-200 text-brand-500 text-xs rounded-lg hover:bg-brand-50 whitespace-nowrap"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-brand-900 font-medium truncate">{cat.name}</span>
                        <span
                          className="shrink-0 text-[11px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: cnt > 0 ? '#fff7ed' : '#f8fafc', color: cnt > 0 ? '#c2410c' : '#94a3b8' }}
                          title={cnt > 0 ? '该分类下有文章，删除时需选择转移目标' : '该分类下暂无文章'}
                        >
                          {cnt} 篇
                        </span>
                        <span className="flex-1" />
                        <span className="hidden sm:inline text-xs text-brand-300" style={{ fontFamily: 'var(--font-mono, monospace)' }}>{cat.slug}</span>
                        <button
                          onClick={() => setCatEditing({ id: cat.id, name: cat.name })}
                          className="px-3 py-1.5 border border-brand-200 text-brand-600 text-xs rounded-lg hover:border-brand-900 hover:text-brand-900 transition-colors whitespace-nowrap"
                        >
                          ✏️ 重命名
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          disabled={catSaving}
                          className="px-3 py-1.5 border border-red-100 text-red-400 text-xs rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors whitespace-nowrap disabled:opacity-40"
                        >
                          🗑 删除
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 保存顺序 */}
            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={handleSaveOrder}
                disabled={!orderDirty || catSaving}
                className="px-5 py-2.5 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {catSaving ? '保存中…' : '保存导航顺序'}
              </button>
              {orderDirty ? (
                <button
                  onClick={() => setCatOrder(savedOrder)}
                  disabled={catSaving}
                  className="px-4 py-2.5 border border-brand-200 text-brand-600 text-sm rounded-lg hover:bg-brand-50 disabled:opacity-40 whitespace-nowrap"
                >
                  撤销改动
                </button>
              ) : (
                <span className="text-xs text-brand-400">当前顺序与线上一致</span>
              )}
            </div>

            {/* ===== 删除确认弹窗（含文章转移） ===== */}
            {deleteTarget && (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center px-4"
                style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
                onClick={() => { if (!catSaving) setDeleteTarget(null); }}
              >
                <div
                  className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6"
                  onClick={e => e.stopPropagation()}
                >
                  <h3 className="text-base font-bold text-brand-900 mb-2">
                    删除分类「{deleteTarget.name}」
                  </h3>

                  {(deleteTarget.article_count ?? 0) > 0 ? (
                    <>
                      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                        该分类下有 <b>{deleteTarget.article_count}</b> 篇文章。删除后这些文章会失去归属，请选择要转移到的分类：
                      </div>
                      <label className="block text-xs text-brand-500 mb-1.5">转移到</label>
                      <select
                        value={moveTo}
                        onChange={e => setMoveTo(e.target.value)}
                        className="w-full px-4 py-2.5 border border-brand-200 rounded-lg text-sm focus:outline-none focus:border-brand-900 mb-5"
                      >
                        <option value="">请选择目标分类…</option>
                        {categories.filter(c => c.id !== deleteTarget.id).map(c => (
                          <option key={c.id} value={c.id}>{c.name}（现有 {c.article_count ?? 0} 篇）</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <p className="mb-5 text-sm text-brand-500">
                      该分类下暂无文章，删除后不影响任何内容。
                    </p>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      disabled={catSaving}
                      className="px-4 py-2.5 border border-brand-200 text-brand-600 text-sm rounded-lg hover:bg-brand-50 disabled:opacity-40"
                    >
                      取消
                    </button>
                    <button
                      onClick={confirmDeleteCategory}
                      disabled={catSaving || ((deleteTarget.article_count ?? 0) > 0 && !moveTo)}
                      className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {catSaving ? '处理中…' : ((deleteTarget.article_count ?? 0) > 0 ? '转移并删除' : '确认删除')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========== ARTICLES ========== */}
        {activeTab === 'articles' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-brand-900">文章列表 <span className="text-sm font-normal text-brand-400">(共 {total} 篇{totalPages > 1 ? ` · 第 ${page}/${totalPages} 页` : ''})</span></h2>
              <div className="flex items-center gap-3">
                <button onClick={() => { setShowImportPanel(!showImportPanel); setShowArticleForm(false); }} className="px-4 py-2 border-2 border-green-500 text-green-600 text-sm font-medium rounded-lg hover:bg-green-50 transition-colors">
                  📥 导入公众号文章
                </button>
                <button onClick={() => { resetArticleForm(); setShowArticleForm(true); setShowImportPanel(false); }} className="px-4 py-2 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800">+ 新建文章</button>
              </div>
            </div>

            {/* 状态筛选（服务端过滤，跨页准确） */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => changeStatusFilter('all')}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === 'all' ? 'bg-brand-900 text-white' : 'text-brand-500 hover:text-brand-900 bg-white border border-brand-200'}`}
              >
                全部 ({counts.total})
              </button>
              <button
                onClick={() => changeStatusFilter('published')}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors ${statusFilter === 'published' ? 'bg-green-600 text-white' : 'text-green-600 hover:text-green-700 bg-white border border-green-200'}`}
              >
                已发布 ({counts.published})
              </button>
              <button
                onClick={() => changeStatusFilter('draft')}
                className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center gap-1 ${statusFilter === 'draft' ? 'bg-amber-500 text-white' : 'text-amber-600 hover:text-amber-700 bg-white border border-amber-200'}`}
              >
                📝 草稿箱 ({counts.draft})
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
                      onChange={(html) => setArticleForm(prev => ({...prev, content: html}))}
                      onTitleImported={(t) => setArticleForm(prev => ({ ...prev, title: prev.title || t }))}
                      placeholder="在此粘贴文章内容，支持图文混排..."
                    />
                  </div>

                  {/* 操作栏：悬浮置底，长文编辑时随时可发布/存草稿，无需滚到底部 */}
                  <div className="sticky bottom-0 z-30 flex items-center gap-3 -mx-6 -mb-6 px-6 py-3 bg-white/95 backdrop-blur border-t border-brand-100 rounded-b-xl shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
                    <button type="submit" className="px-6 py-2.5 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800">{editingArticle ? '保存修改' : '发布文章'}</button>
                    <button type="button" onClick={handleSaveDraft} className="px-6 py-2.5 border-2 border-brand-200 text-brand-600 text-sm font-medium rounded-lg hover:border-brand-900 hover:text-brand-900 transition-colors">💾 保存草稿</button>
                    <button type="button" onClick={resetArticleForm} className="px-5 py-2.5 border border-brand-200 text-brand-600 text-sm rounded-lg hover:bg-brand-50">取消</button>
                    <span className="ml-auto text-xs text-brand-400 hidden sm:inline">✎ 正文 {articleForm.content.replace(/<[^>]+>/g, '').length} 字</span>
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
                    {articles.map(a => (
                      <tr key={a.id} className="hover:bg-brand-50/50">
                        <td className="px-4 py-3 text-brand-900 font-medium max-w-[300px] truncate">{a.title}</td>
                        <td className="px-4 py-3 text-brand-500">{a.category_name}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleFeatured(a)}
                            title={a.is_featured ? '点击取消精选' : '点击设为精选（首页Banner右侧展示）'}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                              a.is_featured
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-brand-50 text-brand-300 hover:bg-amber-50 hover:text-amber-500'
                            }`}
                          >
                            {a.is_featured ? '⭐ 精选' : '＋精选'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleBanner(a)}
                            title={a.is_banner ? '点击取消 Banner' : '点击设为 Banner'}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                              a.is_banner
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-brand-50 text-brand-300 hover:bg-blue-50 hover:text-blue-500'
                            }`}
                          >
                            {a.is_banner ? '🎬 Banner' : '＋Banner'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">{a.status === 'draft' ? <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">草稿</span> : <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">已发布</span>}</td>
                        <td className="px-4 py-3 text-brand-500">{a.view_count}</td>
                        <td className="px-4 py-3 text-brand-400 whitespace-nowrap text-xs">{new Date(a.published_at).toLocaleDateString('zh-CN')}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleEditArticle(a)} className="text-xs px-2 py-1 text-brand-600 hover:bg-brand-50 rounded mr-1">编辑</button>
                          <button onClick={() => handleDeleteArticle(a.id)} className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded">删除</button>
                        </td>
                      </tr>
                    ))}
                    {articles.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-brand-400">{statusFilter === 'draft' ? '草稿箱为空' : '暂无文章'}</td></tr>}
                  </tbody>
                </table>
              </div>

              {/* 分页条：每页 20 条 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-brand-50 bg-brand-50/30">
                  <span className="text-xs text-brand-400">
                    共 {total} 篇 · 每页 {PAGE_SIZE} 条 · 第 {page}/{totalPages} 页
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goPage(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-200 bg-white text-brand-600 hover:bg-brand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ‹ 上一页
                    </button>
                    {pageNumbers.map((p, idx) => (
                      <span key={p} className="flex items-center gap-1">
                        {idx > 0 && p - pageNumbers[idx - 1] > 1 && (
                          <span className="px-1 text-brand-400 select-none">…</span>
                        )}
                        <button
                          onClick={() => goPage(p)}
                          className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                            p === page
                              ? 'bg-brand-900 text-white'
                              : 'border border-brand-200 bg-white text-brand-600 hover:bg-brand-100'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                    <button
                      onClick={() => goPage(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-200 bg-white text-brand-600 hover:bg-brand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      下一页 ›
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== FLASHES ========== */}
        {activeTab === 'flashes' && (
          <div>
            {/* 自动抓取状态卡片 */}
            {flashAutoStats && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1.06 6.7 2.82"/><path d="M21 3v6h-6"/></svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-brand-900">自动抓取已启用</div>
                    <div className="text-xs text-brand-500">
                      已自动抓取 {flashAutoStats.totalAuto} 条
                      {flashAutoStats.lastAutoTime && ` | 最近更新: ${new Date(flashAutoStats.lastAutoTime).toLocaleString('zh-CN')}`}
                      {' | 每 2 小时自动更新'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {flashAutoStats.sources.slice(0, 5).map((s, i) => (
                    <span key={i} className="text-xs px-2 py-1 bg-white/60 text-brand-600 rounded-full font-medium">{s.source}: {s.count}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-brand-900">快讯列表 ({filteredFlashes.length}/{flashes.length})</h2>
              <div className="flex items-center gap-2">
                {flashSelected.size > 0 && (
                  <button onClick={handleBatchDeleteFlash} className="px-3 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100">批量删除 ({flashSelected.size})</button>
                )}
                <button onClick={() => setShowFlashForm(true)} className="px-4 py-2 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-800">+ 新建快讯</button>
              </div>
            </div>

            {/* 来源筛选 */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button onClick={() => setFlashSourceFilter('all')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${flashSourceFilter === 'all' ? 'bg-brand-900 text-white' : 'bg-brand-50 text-brand-500 hover:bg-brand-100'}`}>全部</button>
              <button onClick={() => setFlashSourceFilter('auto')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${flashSourceFilter === 'auto' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500 hover:bg-blue-100'}`}>自动抓取</button>
              <button onClick={() => setFlashSourceFilter('manual')} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${flashSourceFilter === 'manual' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-500 hover:bg-green-100'}`}>手动创建</button>
              {flashSources.map(src => (
                <button key={src} onClick={() => setFlashSourceFilter(src)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${flashSourceFilter === src ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100'}`}>{src}</button>
              ))}
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
                    <th className="text-left px-3 py-3 w-8"><input type="checkbox" checked={flashSelected.size === filteredFlashes.length && filteredFlashes.length > 0} onChange={(e) => setFlashSelected(e.target.checked ? new Set(filteredFlashes.map((f: any) => f.id)) : new Set())} className="rounded" /></th>
                    <th className="text-left px-4 py-3 font-medium">标题</th>
                    <th className="text-left px-4 py-3 font-medium">来源</th>
                    <th className="text-left px-4 py-3 font-medium">时间</th>
                    <th className="text-right px-4 py-3 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {filteredFlashes.map(f => (
                    <tr key={f.id} className="hover:bg-brand-50/50">
                      <td className="px-3 py-3"><input type="checkbox" checked={flashSelected.has(f.id)} onChange={() => toggleFlashSelect(f.id)} className="rounded" /></td>
                      <td className="px-4 py-3 text-brand-900 font-medium max-w-[400px] truncate">
                        {f.title}
                        {f.source_url && <a href={f.source_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-blue-400 hover:text-blue-600">原文</a>}
                      </td>
                      <td className="px-4 py-3">
                        {f.is_auto === 1 ? (
                          <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">自动 · {f.source || '未知'}</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">手动</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-brand-400 text-xs whitespace-nowrap">{new Date(f.published_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 text-right"><button onClick={() => handleDeleteFlash(f.id)} className="text-xs px-2 py-1 text-red-500 hover:bg-red-50 rounded">删除</button></td>
                    </tr>
                  ))}
                  {filteredFlashes.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-brand-400">暂无快讯</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========== COMMENTS ========== */}
        {activeTab === 'comments' && <CommentManager />}

        {/* ========== USERS ========== */}
        {activeTab === 'users' && <UserManager />}

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
                    <div className="relative">
                      <input
                        type={showPwOld ? 'text' : 'password'}
                        value={pwOld}
                        onChange={e => setPwOld(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                        required
                        autoComplete="current-password"
                      />
                      <button type="button" onClick={() => setShowPwOld(v => !v)} tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-700 transition-colors">
                        <EyeIcon open={showPwOld} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">新密码</label>
                    <div className="relative">
                      <input
                        type={showPwNew ? 'text' : 'password'}
                        value={pwNew}
                        onChange={e => setPwNew(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                        required
                        minLength={6}
                        placeholder="至少6个字符"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPwNew(v => !v)} tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-700 transition-colors">
                        <EyeIcon open={showPwNew} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-brand-700 mb-1">确认新密码</label>
                    <div className="relative">
                      <input
                        type={showPwConfirm ? 'text' : 'password'}
                        value={pwConfirm}
                        onChange={e => setPwConfirm(e.target.value)}
                        className="w-full px-4 py-2.5 pr-10 border border-brand-200 rounded-lg focus:outline-none focus:border-brand-900 text-sm"
                        required
                        minLength={6}
                        placeholder="再次输入新密码"
                        autoComplete="new-password"
                      />
                      <button type="button" onClick={() => setShowPwConfirm(v => !v)} tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-400 hover:text-brand-700 transition-colors">
                        <EyeIcon open={showPwConfirm} />
                      </button>
                    </div>
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
