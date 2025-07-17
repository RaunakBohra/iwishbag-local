import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Save,
  Eye,
  FileText,
  Settings,
  Search,
  Share2,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Tag,
  Clock,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BlogPost, BlogCategory, BlogTag, CreateBlogPostForm } from '@/types/blog';
import { generateSlug, estimateReadingTime } from '@/hooks/useBlogPosts';
import { toast } from 'sonner';
import { seoAnalyzer } from '@/lib/seo-analyzer';
import { SEOAnalysis } from '@/components/blog/SEOAnalysis';
import { SERPPreview } from '@/components/blog/SERPPreview';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const blogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  slug: z.string().min(1, 'Slug is required').max(200, 'Slug must be less than 200 characters'),
  excerpt: z.string().max(500, 'Excerpt must be less than 500 characters').optional(),
  content: z.string().min(1, 'Content is required'),
  category_id: z.string().uuid('Please select a category'),
  tag_ids: z.array(z.string().uuid()).optional(),
  featured_image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  meta_title: z.string().max(60, 'Meta title must be less than 60 characters').optional(),
  meta_description: z
    .string()
    .max(160, 'Meta description must be less than 160 characters')
    .optional(),
  og_title: z.string().max(60, 'OpenGraph title must be less than 60 characters').optional(),
  og_description: z
    .string()
    .max(160, 'OpenGraph description must be less than 160 characters')
    .optional(),
  og_image: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  twitter_title: z.string().max(60, 'Twitter title must be less than 60 characters').optional(),
  twitter_description: z
    .string()
    .max(160, 'Twitter description must be less than 160 characters')
    .optional(),
  twitter_image: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  focus_keyword: z.string().max(255, 'Focus keyword must be less than 255 characters').optional(),
  canonical_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']),
  featured: z.boolean(),
  published_at: z.string().optional(),
});

type BlogPostFormData = z.infer<typeof blogPostSchema>;

interface BlogEditorProps {
  post?: BlogPost;
  onSave?: (post: BlogPost) => void;
  onCancel?: () => void;
}

export const BlogEditor: React.FC<BlogEditorProps> = ({ post, onSave, onCancel }) => {
  const [selectedTags, setSelectedTags] = useState<string[]>(
    post?.tags?.map((t) => t.tag.id) || [],
  );
  const [previewMode, setPreviewMode] = useState(false);
  const [seoAnalysis, setSeoAnalysis] = useState<Record<string, unknown> | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [seoOpen, setSeoOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: post?.title || '',
      slug: post?.slug || '',
      excerpt: post?.excerpt || '',
      content: post?.content || '',
      category_id: post?.category_id || '',
      tag_ids: selectedTags,
      featured_image_url: post?.featured_image_url || '',
      meta_title: post?.meta_title || '',
      meta_description: post?.meta_description || '',
      og_title: post?.og_title || '',
      og_description: post?.og_description || '',
      og_image: post?.og_image || '',
      twitter_title: post?.twitter_title || '',
      twitter_description: post?.twitter_description || '',
      twitter_image: post?.twitter_image || '',
      focus_keyword: post?.focus_keyword || '',
      canonical_url: post?.canonical_url || '',
      status: post?.status || 'draft',
      featured: post?.featured || false,
      published_at: post?.published_at || '',
    },
  });

  // Watch form fields for real-time updates
  const watchedTitle = watch('title');
  const watchedSlug = watch('slug');
  const watchedContent = watch('content');
  const watchedExcerpt = watch('excerpt');
  const watchedMetaTitle = watch('meta_title');
  const watchedMetaDescription = watch('meta_description');
  const watchedFocusKeyword = watch('focus_keyword');
  const watchedFeaturedImage = watch('featured_image_url');
  const watchedOgTitle = watch('og_title');
  const watchedOgDescription = watch('og_description');
  const watchedTwitterTitle = watch('twitter_title');
  const watchedTwitterDescription = watch('twitter_description');

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['blog_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_categories')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as BlogCategory[];
    },
  });

  // Fetch tags
  const { data: tags } = useQuery({
    queryKey: ['blog_tags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('blog_tags').select('*').order('name');
      if (error) throw error;
      return data as BlogTag[];
    },
  });

  // Auto-generate slug from title
  useEffect(() => {
    if (watchedTitle && (!post || !post.slug)) {
      const slug = generateSlug(watchedTitle);
      setValue('slug', slug);
    }
  }, [watchedTitle, setValue, post]);

  // Auto-generate meta fields from content
  useEffect(() => {
    if (watchedTitle && !watchedMetaTitle) {
      setValue('meta_title', watchedTitle.slice(0, 60));
    }
    if (watchedExcerpt && !watchedMetaDescription) {
      setValue('meta_description', watchedExcerpt.slice(0, 160));
    }
  }, [watchedTitle, watchedExcerpt, watchedMetaTitle, watchedMetaDescription, setValue]);

  // Run SEO analysis
  useEffect(() => {
    if (watchedTitle && watchedContent) {
      const analysis = seoAnalyzer.analyze({
        title: watchedTitle,
        content: watchedContent,
        excerpt: watchedExcerpt,
        meta_title: watchedMetaTitle,
        meta_description: watchedMetaDescription,
        focus_keyword: watchedFocusKeyword,
        slug: watchedSlug,
        featured_image_url: watchedFeaturedImage,
        og_title: watchedOgTitle,
        og_description: watchedOgDescription,
        twitter_title: watchedTwitterTitle,
        twitter_description: watchedTwitterDescription,
      });
      setSeoAnalysis(analysis);
    }
  }, [
    watchedTitle,
    watchedContent,
    watchedExcerpt,
    watchedMetaTitle,
    watchedMetaDescription,
    watchedFocusKeyword,
    watchedSlug,
    watchedFeaturedImage,
    watchedOgTitle,
    watchedOgDescription,
    watchedTwitterTitle,
    watchedTwitterDescription,
  ]);

  // Handle tag selection
  const handleTagToggle = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter((id) => id !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newTags);
    setValue('tag_ids', newTags);
  };

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: CreateBlogPostForm) => {
      const { tag_ids, ...postData } = data;

      if (postData.status === 'published' && !postData.published_at) {
        postData.published_at = new Date().toISOString();
      }

      postData.reading_time_minutes = estimateReadingTime(postData.content);

      const { data: newPost, error } = await supabase
        .from('blog_posts')
        .insert([postData])
        .select()
        .single();

      if (error) throw error;

      if (tag_ids && tag_ids.length > 0) {
        const tagRelations = tag_ids.map((tag_id) => ({
          post_id: newPost.id,
          tag_id,
        }));

        const { error: tagError } = await supabase.from('blog_post_tags').insert(tagRelations);
        if (tagError) throw tagError;
      }

      return newPost;
    },
    onSuccess: (newPost) => {
      queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
      toast.success('Blog post created successfully!');
      onSave?.(newPost);
    },
    onError: (error) => {
      toast.error('Failed to create blog post: ' + error.message);
    },
  });

  // Update post mutation
  const updatePostMutation = useMutation({
    mutationFn: async (data: BlogPostFormData) => {
      if (!post?.id) throw new Error('Post ID is required for update');

      const { tag_ids, ...postData } = data;

      if (postData.status === 'published' && !postData.published_at) {
        postData.published_at = new Date().toISOString();
      }

      postData.reading_time_minutes = estimateReadingTime(postData.content);

      const { data: updatedPost, error } = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', post.id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('blog_post_tags').delete().eq('post_id', post.id);

      if (tag_ids && tag_ids.length > 0) {
        const tagRelations = tag_ids.map((tag_id) => ({
          post_id: post.id,
          tag_id,
        }));

        const { error: tagError } = await supabase.from('blog_post_tags').insert(tagRelations);
        if (tagError) throw tagError;
      }

      return updatedPost;
    },
    onSuccess: (updatedPost) => {
      queryClient.invalidateQueries({ queryKey: ['blog_posts'] });
      toast.success('Blog post updated successfully!');
      onSave?.(updatedPost);
    },
    onError: (error) => {
      toast.error('Failed to update blog post: ' + error.message);
    },
  });

  const onSubmit = (data: BlogPostFormData) => {
    if (post) {
      updatePostMutation.mutate(data);
    } else {
      createPostMutation.mutate(data);
    }
  };

  const readingTime = watchedContent ? estimateReadingTime(watchedContent) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">
              {post ? 'Edit Blog Post' : 'Create New Blog Post'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              className="flex items-center gap-2"
            >
              {previewMode ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              onClick={handleSubmit(onSubmit)}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save Post'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Controller
                      name="title"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="Enter blog post title"
                          className={errors.title ? 'border-destructive' : ''}
                        />
                      )}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="slug">URL Slug *</Label>
                    <Controller
                      name="slug"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="url-friendly-slug"
                          className={errors.slug ? 'border-destructive' : ''}
                        />
                      )}
                    />
                    {errors.slug && (
                      <p className="text-sm text-destructive mt-1">{errors.slug.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Controller
                    name="excerpt"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Brief description of the post"
                        rows={3}
                        className={errors.excerpt ? 'border-destructive' : ''}
                      />
                    )}
                  />
                  {errors.excerpt && (
                    <p className="text-sm text-destructive mt-1">{errors.excerpt.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Content Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Content
                  <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {readingTime} min read
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="content">Content *</Label>
                  <Controller
                    name="content"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Write your blog post content here..."
                        rows={20}
                        className={`min-h-[500px] ${errors.content ? 'border-destructive' : ''}`}
                      />
                    )}
                  />
                  {errors.content && (
                    <p className="text-sm text-destructive mt-1">{errors.content.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Post Settings */}
            <Card>
              <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Post Settings
                      </div>
                      {settingsOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="category_id">Category *</Label>
                      <Controller
                        name="category_id"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger
                              className={errors.category_id ? 'border-destructive' : ''}
                            >
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories?.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.category_id && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.category_id.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Controller
                          name="status"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-6">
                        <Label htmlFor="featured">Featured</Label>
                        <Controller
                          name="featured"
                          control={control}
                          render={({ field }) => (
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="featured_image_url">Featured Image URL</Label>
                      <Controller
                        name="featured_image_url"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="https://example.com/image.jpg"
                            className={errors.featured_image_url ? 'border-destructive' : ''}
                          />
                        )}
                      />
                      {errors.featured_image_url && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.featured_image_url.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="published_at">Publish Date</Label>
                      <Controller
                        name="published_at"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="datetime-local"
                            className={errors.published_at ? 'border-destructive' : ''}
                          />
                        )}
                      />
                      {errors.published_at && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.published_at.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags?.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant={selectedTags.includes(tag.id) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => handleTagToggle(tag.id)}
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* SEO Settings */}
            <Card>
              <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        SEO Settings
                      </div>
                      {seoOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="focus_keyword">Focus Keyword</Label>
                      <Controller
                        name="focus_keyword"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="main keyword for SEO"
                            className={errors.focus_keyword ? 'border-destructive' : ''}
                          />
                        )}
                      />
                      {errors.focus_keyword && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.focus_keyword.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="meta_title">Meta Title</Label>
                      <Controller
                        name="meta_title"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="SEO title (max 60 chars)"
                            className={errors.meta_title ? 'border-destructive' : ''}
                          />
                        )}
                      />
                      {errors.meta_title && (
                        <p className="text-sm text-destructive mt-1">{errors.meta_title.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="meta_description">Meta Description</Label>
                      <Controller
                        name="meta_description"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="SEO description (max 160 chars)"
                            rows={3}
                            className={errors.meta_description ? 'border-destructive' : ''}
                          />
                        )}
                      />
                      {errors.meta_description && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.meta_description.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="canonical_url">Canonical URL</Label>
                      <Controller
                        name="canonical_url"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="https://example.com/canonical-url"
                            className={errors.canonical_url ? 'border-destructive' : ''}
                          />
                        )}
                      />
                      {errors.canonical_url && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.canonical_url.message}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Social Media */}
            <Card>
              <Collapsible open={socialOpen} onOpenChange={setSocialOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-5 h-5" />
                        Social Media
                      </div>
                      {socialOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="og_title">OpenGraph Title</Label>
                      <Controller
                        name="og_title"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Facebook/LinkedIn title"
                            className={errors.og_title ? 'border-destructive' : ''}
                          />
                        )}
                      />
                      {errors.og_title && (
                        <p className="text-sm text-destructive mt-1">{errors.og_title.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="og_description">OpenGraph Description</Label>
                      <Controller
                        name="og_description"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="Facebook/LinkedIn description"
                            rows={2}
                            className={errors.og_description ? 'border-destructive' : ''}
                          />
                        )}
                      />
                      {errors.og_description && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.og_description.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="og_image">OpenGraph Image</Label>
                      <Controller
                        name="og_image"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="https://example.com/og-image.jpg"
                            className={errors.og_image ? 'border-destructive' : ''}
                          />
                        )}
                      />
                      {errors.og_image && (
                        <p className="text-sm text-destructive mt-1">{errors.og_image.message}</p>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <Label htmlFor="twitter_title">Twitter Title</Label>
                      <Controller
                        name="twitter_title"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="Twitter card title"
                            className={errors.twitter_title ? 'border-destructive' : ''}
                          />
                        )}
                      />
                      {errors.twitter_title && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.twitter_title.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="twitter_description">Twitter Description</Label>
                      <Controller
                        name="twitter_description"
                        control={control}
                        render={({ field }) => (
                          <Textarea
                            {...field}
                            placeholder="Twitter card description"
                            rows={2}
                            className={errors.twitter_description ? 'border-destructive' : ''}
                          />
                        )}
                      />
                      {errors.twitter_description && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.twitter_description.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="twitter_image">Twitter Image</Label>
                      <Controller
                        name="twitter_image"
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            placeholder="https://example.com/twitter-image.jpg"
                            className={errors.twitter_image ? 'border-destructive' : ''}
                          />
                        )}
                      />
                      {errors.twitter_image && (
                        <p className="text-sm text-destructive mt-1">
                          {errors.twitter_image.message}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* SEO Analysis */}
            <Card>
              <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        SEO Analysis
                      </div>
                      {analysisOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {seoAnalysis && (
                      <div className="space-y-4">
                        <SEOAnalysis analysis={seoAnalysis} />
                        <Separator />
                        <SERPPreview
                          preview={seoAnalyzer.generateSERPPreview({
                            title: watchedTitle,
                            content: watchedContent,
                            excerpt: watchedExcerpt,
                            meta_title: watchedMetaTitle,
                            meta_description: watchedMetaDescription,
                            focus_keyword: watchedFocusKeyword,
                            slug: watchedSlug,
                            featured_image_url: watchedFeaturedImage,
                            og_title: watchedOgTitle,
                            og_description: watchedOgDescription,
                            twitter_title: watchedTwitterTitle,
                            twitter_description: watchedTwitterDescription,
                          })}
                        />
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlogEditor;
