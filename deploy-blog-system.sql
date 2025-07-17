-- Deploy Blog System to Cloud Database
-- This script safely creates the blog system tables and functions

-- Create blog categories table
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    color text NOT NULL DEFAULT '#0088cc',
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create blog tags table
CREATE TABLE IF NOT EXISTS public.blog_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    usage_count integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create blog posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    slug text NOT NULL UNIQUE,
    excerpt text,
    content text NOT NULL,
    featured_image_url text,
    author_id uuid NOT NULL REFERENCES auth.users(id),
    category_id uuid NOT NULL REFERENCES public.blog_categories(id),
    status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at timestamp with time zone,
    views_count integer NOT NULL DEFAULT 0,
    meta_title text,
    meta_description text,
    og_title text,
    og_description text,
    og_image text,
    twitter_title text,
    twitter_description text,
    twitter_image text,
    focus_keyword text,
    canonical_url text,
    reading_time_minutes integer NOT NULL DEFAULT 0,
    featured boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create blog comments table
CREATE TABLE IF NOT EXISTS public.blog_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id),
    author_name text,
    author_email text,
    content text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
    parent_id uuid REFERENCES public.blog_comments(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create blog post tags junction table
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    tag_id uuid NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(post_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_author_id ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured ON public.blog_posts(featured);
CREATE INDEX IF NOT EXISTS idx_blog_posts_focus_keyword ON public.blog_posts(focus_keyword);
CREATE INDEX IF NOT EXISTS idx_blog_posts_canonical_url ON public.blog_posts(canonical_url);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON public.blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_parent_id ON public.blog_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_blog_comments_status ON public.blog_comments(status);

-- Create update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_blog_categories_updated_at') THEN
        CREATE TRIGGER update_blog_categories_updated_at
            BEFORE UPDATE ON public.blog_categories
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_blog_tags_updated_at') THEN
        CREATE TRIGGER update_blog_tags_updated_at
            BEFORE UPDATE ON public.blog_tags
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_blog_posts_updated_at') THEN
        CREATE TRIGGER update_blog_posts_updated_at
            BEFORE UPDATE ON public.blog_posts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_blog_comments_updated_at') THEN
        CREATE TRIGGER update_blog_comments_updated_at
            BEFORE UPDATE ON public.blog_comments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- Create function to update tag usage count
CREATE OR REPLACE FUNCTION public.update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.blog_tags 
        SET usage_count = usage_count + 1 
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.blog_tags 
        SET usage_count = GREATEST(usage_count - 1, 0) 
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tag usage count
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tag_usage_count_trigger') THEN
        CREATE TRIGGER update_tag_usage_count_trigger
            AFTER INSERT OR DELETE ON public.blog_post_tags
            FOR EACH ROW EXECUTE FUNCTION public.update_tag_usage_count();
    END IF;
END
$$;

-- Create blog functions
CREATE OR REPLACE FUNCTION public.get_blog_stats()
RETURNS TABLE (
    total_posts bigint,
    published_posts bigint,
    draft_posts bigint,
    total_comments bigint,
    pending_comments bigint,
    total_views bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_posts,
        COUNT(*) FILTER (WHERE status = 'published') as published_posts,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_posts,
        0::bigint as total_comments,
        0::bigint as pending_comments,
        COALESCE(SUM(views_count), 0) as total_views
    FROM public.blog_posts;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_popular_posts(limit_count integer DEFAULT 10)
RETURNS TABLE (
    id uuid,
    title text,
    slug text,
    excerpt text,
    views_count integer,
    category_name text,
    published_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bp.id,
        bp.title,
        bp.slug,
        bp.excerpt,
        bp.views_count,
        bc.name as category_name,
        bp.published_at
    FROM public.blog_posts bp
    JOIN public.blog_categories bc ON bp.category_id = bc.id
    WHERE bp.status = 'published'
    ORDER BY bp.views_count DESC, bp.published_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_related_posts(post_slug text, limit_count integer DEFAULT 5)
RETURNS TABLE (
    id uuid,
    title text,
    slug text,
    excerpt text,
    featured_image_url text,
    category_name text,
    published_at timestamp with time zone
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bp.id,
        bp.title,
        bp.slug,
        bp.excerpt,
        bp.featured_image_url,
        bc.name as category_name,
        bp.published_at
    FROM public.blog_posts bp
    JOIN public.blog_categories bc ON bp.category_id = bc.id
    WHERE bp.status = 'published' 
    AND bp.slug != post_slug
    ORDER BY bp.published_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.increment_post_views(post_slug text)
RETURNS void AS $$
BEGIN
    UPDATE public.blog_posts 
    SET views_count = views_count + 1 
    WHERE slug = post_slug AND status = 'published';
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Blog categories (publicly readable, admin manageable)
DROP POLICY IF EXISTS "Blog categories are publicly readable" ON public.blog_categories;
CREATE POLICY "Blog categories are publicly readable" ON public.blog_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can create/update/delete blog categories" ON public.blog_categories;
CREATE POLICY "Only admins can create/update/delete blog categories" ON public.blog_categories
    FOR ALL USING (is_admin());

-- Blog tags (publicly readable, admin manageable)
DROP POLICY IF EXISTS "Blog tags are publicly readable" ON public.blog_tags;
CREATE POLICY "Blog tags are publicly readable" ON public.blog_tags
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can create/update/delete blog tags" ON public.blog_tags;
CREATE POLICY "Only admins can create/update/delete blog tags" ON public.blog_tags
    FOR ALL USING (is_admin());

-- Blog posts (published posts readable, admin manageable)
DROP POLICY IF EXISTS "Published blog posts are publicly readable" ON public.blog_posts;
CREATE POLICY "Published blog posts are publicly readable" ON public.blog_posts
    FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Only admins can create/update/delete blog posts" ON public.blog_posts;
CREATE POLICY "Only admins can create/update/delete blog posts" ON public.blog_posts
    FOR ALL USING (is_admin());

-- Blog comments (readable for published posts, authenticated users can create)
DROP POLICY IF EXISTS "Comments are readable for published posts" ON public.blog_comments;
CREATE POLICY "Comments are readable for published posts" ON public.blog_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.blog_posts 
            WHERE id = blog_comments.post_id 
            AND status = 'published'
        )
    );

DROP POLICY IF EXISTS "Authenticated users can create comments on published posts" ON public.blog_comments;
CREATE POLICY "Authenticated users can create comments on published posts" ON public.blog_comments
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        EXISTS (
            SELECT 1 FROM public.blog_posts 
            WHERE id = blog_comments.post_id 
            AND status = 'published'
        )
    );

DROP POLICY IF EXISTS "Users can update their own comments" ON public.blog_comments;
CREATE POLICY "Users can update their own comments" ON public.blog_comments
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.blog_comments;
CREATE POLICY "Users can delete their own comments" ON public.blog_comments
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Guest comments require approval" ON public.blog_comments;
CREATE POLICY "Guest comments require approval" ON public.blog_comments
    FOR ALL USING (is_admin() OR (user_id IS NULL AND status = 'approved'));

-- Blog post tags (readable for published posts, admin manageable)
DROP POLICY IF EXISTS "Blog post tags are readable for published posts" ON public.blog_post_tags;
CREATE POLICY "Blog post tags are readable for published posts" ON public.blog_post_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.blog_posts 
            WHERE id = blog_post_tags.post_id 
            AND status = 'published'
        )
    );

DROP POLICY IF EXISTS "Only admins can manage blog post tags" ON public.blog_post_tags;
CREATE POLICY "Only admins can manage blog post tags" ON public.blog_post_tags
    FOR ALL USING (is_admin());

-- Insert initial blog categories
INSERT INTO public.blog_categories (name, slug, description, color, display_order)
VALUES 
    ('E-commerce', 'ecommerce', 'Tips and strategies for online shopping and e-commerce', '#0088cc', 1),
    ('International Shopping', 'international-shopping', 'Guide to shopping from international platforms', '#28a745', 2),
    ('Product Reviews', 'product-reviews', 'Detailed reviews of products and services', '#ffc107', 3),
    ('Shopping Tips', 'shopping-tips', 'Money-saving tips and shopping hacks', '#dc3545', 4),
    ('Technology', 'technology', 'Latest tech trends and gadgets', '#6f42c1', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert initial blog tags
INSERT INTO public.blog_tags (name, slug)
VALUES 
    ('Amazon', 'amazon'),
    ('Shopping', 'shopping'),
    ('E-commerce', 'ecommerce'),
    ('International', 'international'),
    ('Reviews', 'reviews'),
    ('Tips', 'tips'),
    ('Technology', 'technology'),
    ('Gadgets', 'gadgets'),
    ('Deals', 'deals'),
    ('Savings', 'savings')
ON CONFLICT (slug) DO NOTHING;

-- Grant permissions
GRANT SELECT ON public.blog_categories TO anon, authenticated;
GRANT SELECT ON public.blog_tags TO anon, authenticated;
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT SELECT ON public.blog_comments TO anon, authenticated;
GRANT SELECT ON public.blog_post_tags TO anon, authenticated;

GRANT ALL ON public.blog_categories TO service_role;
GRANT ALL ON public.blog_tags TO service_role;
GRANT ALL ON public.blog_posts TO service_role;
GRANT ALL ON public.blog_comments TO service_role;
GRANT ALL ON public.blog_post_tags TO service_role;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_blog_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_popular_posts(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_related_posts(text, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_post_views(text) TO anon, authenticated, service_role;