-- Drop existing function and create a simple one
DROP FUNCTION IF EXISTS get_related_posts(TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_related_posts(TEXT);

-- Create a simple version that should work
CREATE OR REPLACE FUNCTION get_related_posts(post_slug TEXT, limit_count INTEGER DEFAULT 3)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  excerpt TEXT,
  featured_image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  reading_time_minutes INTEGER,
  category_name TEXT,
  views_count INTEGER
) AS $$
BEGIN
  -- Simple version: just return published posts excluding the current one
  RETURN QUERY
  SELECT 
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.featured_image_url,
    bp.published_at,
    bp.reading_time_minutes,
    COALESCE(bc.name, 'Uncategorized') as category_name,
    COALESCE(bp.views_count, 0) as views_count
  FROM blog_posts bp
  LEFT JOIN blog_categories bc ON bp.category_id = bc.id
  WHERE bp.status = 'published'
    AND bp.slug != post_slug
  ORDER BY bp.published_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_related_posts(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_related_posts(TEXT, INTEGER) TO anon;