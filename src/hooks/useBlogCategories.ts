import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  BlogCategory,
  BlogTag,
  CreateBlogCategoryForm,
  UpdateBlogCategoryForm,
  CreateBlogTagForm,
  UpdateBlogTagForm,
} from '@/types/blog';

// Query Keys
export const BLOG_CATEGORIES_KEYS = {
  all: ['blog_categories'] as const,
  list: () => [...BLOG_CATEGORIES_KEYS.all, 'list'] as const,
};

export const BLOG_TAGS_KEYS = {
  all: ['blog_tags'] as const,
  list: () => [...BLOG_TAGS_KEYS.all, 'list'] as const,
  popular: () => [...BLOG_TAGS_KEYS.all, 'popular'] as const,
};

// Blog Categories Hooks
export const useBlogCategories = () => {
  return useQuery({
    queryKey: BLOG_CATEGORIES_KEYS.list(),
    queryFn: async (): Promise<BlogCategory[]> => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - categories don't change often
  });
};

export const useCreateBlogCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBlogCategoryForm): Promise<BlogCategory> => {
      const { data: category, error } = await supabase
        .from('blog_categories')
        .insert([data])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOG_CATEGORIES_KEYS.all });
    },
  });
};

export const useUpdateBlogCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBlogCategoryForm): Promise<BlogCategory> => {
      const { id, ...updateData } = data;

      const { data: category, error } = await supabase
        .from('blog_categories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOG_CATEGORIES_KEYS.all });
    },
  });
};

export const useDeleteBlogCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Check if category has posts
      const { count } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', id);

      if (count && count > 0) {
        throw new Error(
          'Cannot delete category that has blog posts. Please move posts to another category first.',
        );
      }

      const { error } = await supabase.from('blog_categories').delete().eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOG_CATEGORIES_KEYS.all });
    },
  });
};

// Blog Tags Hooks
export const useBlogTags = (includeUsageCount: boolean = false) => {
  return useQuery({
    queryKey: BLOG_TAGS_KEYS.list(),
    queryFn: async (): Promise<BlogTag[]> => {
      let query = supabase.from('blog_tags').select('*');

      if (includeUsageCount) {
        query = query.order('usage_count', { ascending: false });
      } else {
        query = query.order('name', { ascending: true });
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const usePopularBlogTags = (limit: number = 10) => {
  return useQuery({
    queryKey: BLOG_TAGS_KEYS.popular(),
    queryFn: async (): Promise<BlogTag[]> => {
      const { data, error } = await supabase
        .from('blog_tags')
        .select('*')
        .gt('usage_count', 0)
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useCreateBlogTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBlogTagForm): Promise<BlogTag> => {
      const { data: tag, error } = await supabase
        .from('blog_tags')
        .insert([data])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOG_TAGS_KEYS.all });
    },
  });
};

export const useUpdateBlogTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBlogTagForm): Promise<BlogTag> => {
      const { id, ...updateData } = data;

      const { data: tag, error } = await supabase
        .from('blog_tags')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return tag;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOG_TAGS_KEYS.all });
    },
  });
};

export const useDeleteBlogTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Check if tag is being used
      const { count } = await supabase
        .from('blog_post_tags')
        .select('*', { count: 'exact', head: true })
        .eq('tag_id', id);

      if (count && count > 0) {
        throw new Error(
          'Cannot delete tag that is being used by blog posts. Please remove it from posts first.',
        );
      }

      const { error } = await supabase.from('blog_tags').delete().eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BLOG_TAGS_KEYS.all });
    },
  });
};

// Utility functions
export const generateCategorySlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const generateTagSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// Get category by slug
export const useBlogCategoryBySlug = (slug: string) => {
  const { data: categories } = useBlogCategories();
  return categories?.find((category) => category.slug === slug);
};

// Get tag by slug
export const useBlogTagBySlug = (slug: string) => {
  const { data: tags } = useBlogTags();
  return tags?.find((tag) => tag.slug === slug);
};
