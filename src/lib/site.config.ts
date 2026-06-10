// ========================================
// 奇点网站全局配置 — 改这里的值即可调整网站
// ⚠️ 路径请用正斜杠 / 不要用反斜杠 \
// ========================================

export const siteConfig = {
  // ---- 品牌 ----
  name: '奇点',
  tagline: 'QIDIAN',
  slogan: '用有趣、好玩的视角，看科技，看人文，找寻时代奇点',
  description: '记录智能时代的每一次突破',

  // ---- Logo ----
  // type: 'text'=文字logo  'image'=图片logo（图片放到 public/ 目录）
  logo: {
    type: 'image' as 'text' | 'image',
    text: '奇',
    imageUrl: '/logo.png',
  },

  // ---- 配色（改hex值立即生效） ----
  colors: {
    primary: '#121212',
    accent: '#f4d933',
    background: '#ffffff',
    surface: '#f8f8f8',
    border: '#e4e4e4',
    textPrimary: '#1a1a1a',
    textSecondary: '#6a6a6a',
    textMuted: '#9a9a9a',
    footer: '#0d0d0d',
  },

  // ---- 联系方式 ----
  contact: {
    editorEmail: 'qiboshi2025@gmail.com',
    bizEmail: 'qiboshi2025@gmail.com',
    hrEmail: 'qiboshi2025@gmail.com',
  },

  // ---- 首页布局 ----
  homepage: {
    showFeatured: true,
    showFlashOnRight: true,
    flashCount: 6,
    showContactCard: true,
  },

  // ---- 导航分类（增删改这里） ----
  categories: [
    { slug: '24h-news', name: '24小时快讯' },
    { slug: 'retail-ecommerce', name: '零售电商' },
    { slug: 'mobile-digital', name: '手机数码' },
    { slug: 'ai-llm', name: 'AI大模型' },
    { slug: 'embodied-ai', name: '具身智能' },
    { slug: 'ai-hardware', name: 'AI硬件' },
    { slug: 'ai-applications', name: 'AI应用' },
    { slug: 'ip-gaming', name: 'IP游戏' },
  ],

  // ---- 页脚链接 ----
  footerLinks: [
    { label: '联系奇点', href: '/contact' },
    { label: '关于奇点', href: '/about' },
    { label: '加入我们', href: '/join' },
    { label: '广告合作', href: '/advertise' },
  ],

  // ---- SEO ----
  seo: {
    defaultTitle: '奇点 - 用有趣、好玩的视角，看科技，看人文，找寻时代奇点',
    titleTemplate: '%s | 奇点',
    keywords: ['AI', '人工智能', '大模型', '具身智能', '科技', '商业'],
  },
};

export const colorMap = siteConfig.colors;
