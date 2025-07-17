-- Blog System RLS Policies
-- Creates Row Level Security policies for all blog tables

-- First, let's check if is_admin function exists, if not create it
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    );
EXCEPTION
    WHEN others THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Blog Categories Policies
-- Categories are publicly readable, admin-only writable
CREATE POLICY "Blog categories are publicly readable" ON public.blog_categories
    FOR SELECT USING (true);

CREATE POLICY "Only admins can create/update/delete blog categories" ON public.blog_categories
    FOR ALL USING (is_admin());

-- Blog Tags Policies  
-- Tags are publicly readable, admin-only writable
CREATE POLICY "Blog tags are publicly readable" ON public.blog_tags
    FOR SELECT USING (true);

CREATE POLICY "Only admins can create/update/delete blog tags" ON public.blog_tags
    FOR ALL USING (is_admin());

-- Blog Posts Policies
-- Published posts are publicly readable, all operations admin-only
CREATE POLICY "Published blog posts are publicly readable" ON public.blog_posts
    FOR SELECT USING (
        status = 'published' OR is_admin()
    );

CREATE POLICY "Only admins can create/update/delete blog posts" ON public.blog_posts
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Only admins can update blog posts" ON public.blog_posts
    FOR UPDATE USING (is_admin());

CREATE POLICY "Only admins can delete blog posts" ON public.blog_posts
    FOR DELETE USING (is_admin());

-- Blog Post Tags Junction Table Policies
-- Readable when linked to published posts, admin-only writable
CREATE POLICY "Blog post tags are readable for published posts" ON public.blog_post_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.blog_posts bp 
            WHERE bp.id = post_id AND (bp.status = 'published' OR is_admin())
        )
    );

CREATE POLICY "Only admins can manage blog post tags" ON public.blog_post_tags
    FOR ALL USING (is_admin());

-- Blog Comments Policies
-- Comments are readable for published posts, users can create comments on published posts
CREATE POLICY "Comments are readable for published posts" ON public.blog_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.blog_posts bp 
            WHERE bp.id = post_id AND bp.status = 'published'
        ) OR is_admin()
    );

CREATE POLICY "Authenticated users can create comments on published posts" ON public.blog_comments
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.blog_posts bp 
            WHERE bp.id = post_id AND bp.status = 'published'
        )
    );

CREATE POLICY "Users can update their own comments" ON public.blog_comments
    FOR UPDATE USING (
        auth.uid() = user_id OR is_admin()
    );

CREATE POLICY "Users can delete their own comments" ON public.blog_comments
    FOR DELETE USING (
        auth.uid() = user_id OR is_admin()
    );

-- Additional policy for guest comments (if implemented later)
-- This would allow unauthenticated users to submit comments that require approval
CREATE POLICY "Guest comments require approval" ON public.blog_comments
    FOR INSERT WITH CHECK (
        (auth.uid() IS NULL AND status = 'pending') OR
        (auth.uid() IS NOT NULL) OR
        is_admin()
    );

-- Function to get blog post statistics (for admin)
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
        (SELECT COUNT(*) FROM public.blog_posts),
        (SELECT COUNT(*) FROM public.blog_posts WHERE status = 'published'),
        (SELECT COUNT(*) FROM public.blog_posts WHERE status = 'draft'),
        (SELECT COUNT(*) FROM public.blog_comments),
        (SELECT COUNT(*) FROM public.blog_comments WHERE status = 'pending'),
        (SELECT COALESCE(SUM(views_count), 0) FROM public.blog_posts WHERE status = 'published');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage on the stats function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_blog_stats() TO authenticated;

-- Function to get popular blog posts
CREATE OR REPLACE FUNCTION public.get_popular_posts(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    excerpt TEXT,
    views_count INTEGER,
    category_name TEXT,
    published_at TIMESTAMP WITH TIME ZONE
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
    LEFT JOIN public.blog_categories bc ON bp.category_id = bc.id
    WHERE bp.status = 'published'
    ORDER BY bp.views_count DESC, bp.published_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage on the popular posts function to all users
GRANT EXECUTE ON FUNCTION public.get_popular_posts(INTEGER) TO anon, authenticated;

-- Function to get related posts (based on same category or tags)
CREATE OR REPLACE FUNCTION public.get_related_posts(post_slug TEXT, limit_count INTEGER DEFAULT 3)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    excerpt TEXT,
    featured_image_url TEXT,
    category_name TEXT,
    published_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    current_post_id UUID;
    current_category_id UUID;
BEGIN
    -- Get current post info
    SELECT bp.id, bp.category_id INTO current_post_id, current_category_id
    FROM public.blog_posts bp
    WHERE bp.slug = post_slug AND bp.status = 'published';
    
    -- If post not found, return empty
    IF current_post_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT DISTINCT
        bp.id,
        bp.title,
        bp.slug,
        bp.excerpt,
        bp.featured_image_url,
        bc.name as category_name,
        bp.published_at
    FROM public.blog_posts bp
    LEFT JOIN public.blog_categories bc ON bp.category_id = bc.id
    LEFT JOIN public.blog_post_tags bpt ON bp.id = bpt.post_id
    WHERE bp.status = 'published' 
      AND bp.id != current_post_id
      AND (
          bp.category_id = current_category_id OR
          EXISTS (
              SELECT 1 FROM public.blog_post_tags bpt2 
              WHERE bpt2.post_id = current_post_id 
              AND bpt2.tag_id = bpt.tag_id
          )
      )
    ORDER BY 
        CASE WHEN bp.category_id = current_category_id THEN 1 ELSE 2 END,
        bp.published_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage on the related posts function to all users
GRANT EXECUTE ON FUNCTION public.get_related_posts(TEXT, INTEGER) TO anon, authenticated;