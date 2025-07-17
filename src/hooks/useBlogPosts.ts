import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  BlogPost,
  BlogPostFilters,
  BlogPostsResponse,
  CreateBlogPostForm,
  UpdateBlogPostForm,
  PopularPost,
  RelatedPost,
} from '@/types/blog';

// Query Keys
export const BLOG_POSTS_KEYS = {
  all: ['blog_posts'] as const,
  lists: () => [...BLOG_POSTS_KEYS.all, 'list'] as const,
  list: (filters: BlogPostFilters) => [...BLOG_POSTS_KEYS.lists(), filters] as const,
  details: () => [...BLOG_POSTS_KEYS.all, 'detail'] as const,
  detail: (slug: string) => [...BLOG_POSTS_KEYS.details(), slug] as const,
  popular: () => [...BLOG_POSTS_KEYS.all, 'popular'] as const,
  related: (slug: string) => [...BLOG_POSTS_KEYS.all, 'related', slug] as const,
};

// Fetch blog posts with filters
export const useBlogPosts = (filters: BlogPostFilters = {}) => {
  return useQuery({
    queryKey: BLOG_POSTS_KEYS.list(filters),
    queryFn: async (): Promise<BlogPostsResponse> => {
      const {
        category_id,
        tag_ids,
        status,
        search,
        featured,
        author_id,
        page = 1,
        per_page = 10,
        sort_by = 'published_at',
        sort_order = 'desc',
      } = filters;

      let query = supabase.from('blog_posts').select(
        `
          *,
          category:blog_categories(*),
          tags:blog_post_tags(
            tag:blog_tags(*)
          )
        `,
        { count: 'exact' },
      );

      // Apply filters
      if (category_id) {
        query = query.eq('category_id', category_id);
      }

      if (status) {
        query = query.eq('status', status);
      } else {
        // Default to published posts for non-admin users
        query = query.eq('status', 'published');
      }

      if (featured !== undefined) {
        query = query.eq('featured', featured);
      }

      if (author_id) {
        query = query.eq('author_id', author_id);
      }

      if (search) {
        query = query.or(
          `title.ilike.%${search}%,content.ilike.%${search}%,excerpt.ilike.%${search}%`,
        );
      }

      // Tag filtering (if tag_ids provided)
      if (tag_ids && tag_ids.length > 0) {
        query = query.in(
          'id',
          supabase.from('blog_post_tags').select('post_id').in('tag_id', tag_ids),
        );
      }

      // Sorting
      query = query.order(sort_by, { ascending: sort_order === 'asc' });

      // Pagination
      const from = (page - 1) * per_page;
      const to = from + per_page - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        data: data || [],
        count: count || 0,
        page,
        per_page,
        total_pages: Math.ceil((count || 0) / per_page),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Fetch single blog post by slug
export const useBlogPost = (slug: string) => {
  return useQuery({
    queryKey: BLOG_POSTS_KEYS.detail(slug),
    queryFn: async (): Promise<BlogPost | null> => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select(
          `
          *,
          category:blog_categories(*),
          tags:blog_post_tags(
            tag:blog_tags(*)
          )
        `,
        )
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Post not found
        }
        throw new Error(error.message);
      }

      // Increment views
      await supabase.rpc('increment_post_views', { post_slug: slug });

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Fetch popular posts
export const usePopularPosts = (limit: number = 5) => {
  return useQuery({
    queryKey: BLOG_POSTS_KEYS.popular(),
    queryFn: async (): Promise<PopularPost[]> => {
      const { data, error } = await supabase.rpc('get_popular_posts', { limit_count: limit });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

// Fetch related posts
export const useRelatedPosts = (slug: string, limit: number = 3) => {
  return useQuery({
    queryKey: BLOG_POSTS_KEYS.related(slug),
    queryFn: async (): Promise<RelatedPost[]> => {
      // Skip if no slug provided
      if (!slug || slug.trim() === '') {
        return [];
      }

      const { data, error } = await supabase.rpc('get_related_posts', {
        post_slug: slug,
        limit_count: limit,
      });

      if (error) {
        console.error('Related posts error:', error);
        throw new Error(error.message);
      }

      return data || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    enabled: !!slug && slug.trim() !== '', // Only run query when slug is valid
  });
};

// Create blog post mutation
export const useCreateBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBlogPostForm): Promise<BlogPost> => {
      const { tag_ids, ...postData } = data;

      // Create the post
      const { data: post, error: postError } = await supabase
        .from('blog_posts')
        .insert([postData])
        .select()
        .single();

      if (postError) {
        throw new Error(postError.message);
      }

      // Add tags if provided
      if (tag_ids && tag_ids.length > 0) {
        const tagRelations = tag_ids.map((tag_id) => ({
          post_id: post.id,
          tag_id,
        }));

        const { error: tagError } = await supabase.from('blog_post_tags').insert(tagRelations);

        if (tagError) {
          throw new Error(tagError.message);
        }
      }

      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOG_POSTS_KEYS.all });
    },
  });
};

// Update blog post mutation
export const useUpdateBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBlogPostForm): Promise<BlogPost> => {
      const { id, tag_ids, ...updateData } = data;

      // Update the post
      const { data: post, error: postError } = await supabase
        .from('blog_posts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (postError) {
        throw new Error(postError.message);
      }

      // Update tags if provided
      if (tag_ids !== undefined) {
        // Remove existing tags
        await supabase.from('blog_post_tags').delete().eq('post_id', id);

        // Add new tags
        if (tag_ids.length > 0) {
          const tagRelations = tag_ids.map((tag_id) => ({
            post_id: id,
            tag_id,
          }));

          const { error: tagError } = await supabase.from('blog_post_tags').insert(tagRelations);

          if (tagError) {
            throw new Error(tagError.message);
          }
        }
      }

      return post;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: BLOG_POSTS_KEYS.all });
      queryClient.invalidateQueries({ queryKey: BLOG_POSTS_KEYS.detail(data.slug) });
    },
  });
};

// Delete blog post mutation
export const useDeleteBlogPost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOG_POSTS_KEYS.all });
    },
  });
};

// Generate slug from title
export const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// Estimate reading time
export const estimateReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};
