// ========================================
// 奇点网站全局配置 — 改这里的值即可调整网站
// ========================================

export const siteConfig = {
  // ---- 品牌 ----
  name: '奇点',
  tagline: 'QIDIAN',
  slogan: '聚焦AI、科技与商业的深度媒体平台',
  description: '记录智能时代的每一次突破',

  // ---- Logo（可改为图片URL） ----
  logo: {
    type: 'text' as 'text' | 'image',  // 'text' 显示文字logo, 'image' 显示图片
    text: '奇',                          // 文字logo显示的字
    imageUrl: '/logo.png',              // 图片logo的路径（type='image'时生效）
  },

  // ---- 配色 ----
  colors: {
    primary: '#1a1a1a',       // 主色（导航、按钮、标题）
    accent: '#c41e3a',        // 强调色（链接、标签、快讯圆点）
    background: '#ffffff',    // 页面背景
    surface: '#f8f8f8',       // 卡片背景
    border: '#e4e4e4',       // 边框
    textPrimary: '#1a1a1a',  // 主文字
    textSecondary: '#6a6a6a', // 次要文字
    textMuted: '#9a9a9a',    // 辅助文字
    footer: '#0d0d0d',       // 页脚背景
  },

  // ---- 联系方式 ----
  contact: {
    editorEmail: 'editor@qidian.news',   // 投稿/爆料
    bizEmail: 'biz@qidian.news',         // 商务合作
    hrEmail: 'hr@qidian.news',           // 加入我们
  },

  // ---- 首页布局 ----
  homepage: {
    showFeatured: true,           // 是否显示推荐大图
    showFlashOnRight: true,       // 右侧是否显示快讯
    flashCount: 6,                // 快讯显示条数
    showContactCard: true,        // 是否显示联系卡片
  },

  // ---- 导航分类（增删改这里即可） ----
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
    defaultTitle: '奇点 - 科技与商业深度报道',
    titleTemplate: '%s | 奇点',
    keywords: ['AI', '人工智能', '大模型', '具身智能', '科技', '商业'],
  },
};

// 导出便捷的颜色映射到 tailwind classes
export const colorMap = siteConfig.colors;
