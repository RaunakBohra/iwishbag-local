-- Fix blog functions
DROP FUNCTION IF EXISTS public.get_popular_posts(integer);
DROP FUNCTION IF EXISTS public.get_related_posts(text, integer);

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

GRANT EXECUTE ON FUNCTION public.get_popular_posts(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_related_posts(text, integer) TO anon, authenticated, service_role;