// Type definitions for the media site

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image: string | null;
  category_id: number;
  category_slug?: string;
  category_name?: string;
  author: string;
  tags: string[];
  is_featured: boolean;
  is_exclusive: boolean;
  view_count: number;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface FlashNews {
  id: number;
  title: string;
  content: string;
  date_label: string;
  published_at: string;
  created_at: string;
}

export interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export const CATEGORIES: { slug: string; name: string; description: string }[] = [
  { slug: '24h-news', name: '24小时快讯', description: '最新最快的行业资讯' },
  { slug: 'retail-ecommerce', name: '零售电商', description: '零售与电商行业动态' },
  { slug: 'mobile-digital', name: '手机数码', description: '手机与数码产品资讯' },
  { slug: 'ai-llm', name: 'AI大模型', description: '大语言模型与AI基础设施' },
  { slug: 'embodied-ai', name: '具身智能', description: '机器人与具身智能' },
  { slug: 'ai-hardware', name: 'AI硬件', description: 'AI芯片与智能硬件' },
  { slug: 'ai-applications', name: 'AI应用', description: 'AI应用与产品落地' },
  { slug: 'ip-gaming', name: 'IP游戏', description: '游戏与IP产业动态' },
];
