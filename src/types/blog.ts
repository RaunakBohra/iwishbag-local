// Blog System Types
// Defines TypeScript interfaces for all blog-related data structures

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image_url?: string;
  author_id: string;
  category_id: string;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  views_count: number;
  meta_title?: string;
  meta_description?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  focus_keyword?: string;
  canonical_url?: string;
  reading_time_minutes: number;
  featured: boolean;
  created_at: string;
  updated_at: string;

  // Relations (populated when needed)
  category?: BlogCategory;
  tags?: BlogTag[];
  comments?: BlogComment[];
  author?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface BlogComment {
  id: string;
  post_id: string;
  user_id?: string;
  author_name?: string;
  author_email?: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  parent_id?: string;
  created_at: string;
  updated_at: string;

  // Relations
  author?: {
    id: string;
    email: string;
    name?: string;
  };
  replies?: BlogComment[];
}

export interface BlogPostTag {
  id: string;
  post_id: string;
  tag_id: string;
  created_at: string;
}

// API Response Types
export interface BlogPostsResponse {
  data: BlogPost[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface BlogStats {
  total_posts: number;
  published_posts: number;
  draft_posts: number;
  total_comments: number;
  pending_comments: number;
  total_views: number;
}

export interface PopularPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  views_count: number;
  category_name: string;
  published_at: string;
}

export interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image_url?: string;
  category_name: string;
  published_at: string;
}

// Form Types
export interface CreateBlogPostForm {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image_url?: string;
  category_id: string;
  status: 'draft' | 'published';
  meta_title?: string;
  meta_description?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  focus_keyword?: string;
  canonical_url?: string;
  featured: boolean;
  tag_ids: string[];
}

export interface UpdateBlogPostForm extends Partial<CreateBlogPostForm> {
  id: string;
}

export interface CreateBlogCategoryForm {
  name: string;
  slug: string;
  description?: string;
  color: string;
  display_order: number;
}

export interface UpdateBlogCategoryForm extends Partial<CreateBlogCategoryForm> {
  id: string;
}

export interface CreateBlogTagForm {
  name: string;
  slug: string;
}

export interface UpdateBlogTagForm extends Partial<CreateBlogTagForm> {
  id: string;
}

export interface CreateBlogCommentForm {
  post_id: string;
  content: string;
  author_name?: string;
  author_email?: string;
  parent_id?: string;
}

export interface UpdateBlogCommentForm {
  id: string;
  content?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'spam';
}

// Filter and Search Types
export interface BlogPostFilters {
  category_id?: string;
  tag_ids?: string[];
  status?: 'draft' | 'published' | 'archived';
  search?: string;
  featured?: boolean;
  author_id?: string;
  page?: number;
  per_page?: number;
  sort_by?: 'created_at' | 'updated_at' | 'published_at' | 'views_count' | 'title';
  sort_order?: 'asc' | 'desc';
}

export interface BlogCommentFilters {
  post_id?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'spam';
  parent_id?: string;
  page?: number;
  per_page?: number;
}

// SEO and Meta Types
export interface BlogSEOData {
  title: string;
  description: string;
  keywords: string[];
  canonical_url: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_type: 'article';
  article_author?: string;
  article_published_time?: string;
  article_modified_time?: string;
  article_section?: string;
  article_tag?: string[];
}

// SEO Analysis Types
export interface SEOAnalysis {
  score: number;
  maxScore: number;
  checks: SEOCheck[];
  recommendations: string[];
}

export interface SEOCheck {
  id: string;
  title: string;
  description: string;
  status: 'passed' | 'failed' | 'warning';
  score: number;
  maxScore: number;
  recommendation?: string;
}

export interface SERPPreview {
  title: string;
  url: string;
  description: string;
  breadcrumb?: string;
}

// Reading Progress Types
export interface ReadingProgress {
  post_id: string;
  user_id?: string;
  progress_percentage: number;
  reading_time_spent: number;
  last_position: number;
  created_at: string;
  updated_at: string;
}

// Newsletter Integration Types
export interface BlogSubscription {
  id: string;
  email: string;
  name?: string;
  subscribed_at: string;
  categories?: string[];
  tags?: string[];
  active: boolean;
}

// Content Personalization Types
export interface ContentRecommendation {
  post: BlogPost;
  relevance_score: number;
  recommendation_reason: 'category' | 'tags' | 'popularity' | 'reading_history';
}

// Analytics Types
export interface BlogAnalytics {
  post_id: string;
  date: string;
  views: number;
  unique_views: number;
  average_reading_time: number;
  bounce_rate: number;
  comments_count: number;
  social_shares: number;
}

// Rich Text Editor Types
export interface EditorConfig {
  toolbar: string[];
  plugins: string[];
  image_upload_url: string;
  max_image_size: number;
  allowed_formats: string[];
}

// Sitemap Types
export interface BlogSitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'daily' | 'weekly' | 'monthly';
  priority: number;
}

// Database Row Types (for Supabase)
export interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  author_id: string;
  category_id: string;
  status: string;
  published_at: string | null;
  views_count: number;
  meta_title: string | null;
  meta_description: string | null;
  reading_time_minutes: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface BlogTagRow {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface BlogCommentRow {
  id: string;
  post_id: string;
  user_id: string | null;
  author_name: string | null;
  author_email: string | null;
  content: string;
  status: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostTagRow {
  id: string;
  post_id: string;
  tag_id: string;
  created_at: string;
}
