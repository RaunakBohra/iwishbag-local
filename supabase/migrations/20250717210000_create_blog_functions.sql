-- Create blog-related database functions

-- Function to increment post views
CREATE OR REPLACE FUNCTION increment_post_views(post_slug TEXT)
RETURNS VOID AS $$
BEGIN
  -- For now, this is a placeholder function
  -- In a real implementation, you might want to track views in a separate table
  -- UPDATE blog_posts SET views = COALESCE(views, 0) + 1 WHERE slug = post_slug;
  
  -- Since we don't have a views column, we'll just return
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get popular posts
CREATE OR REPLACE FUNCTION get_popular_posts(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  slug VARCHAR(255),
  excerpt TEXT,
  featured_image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  reading_time_minutes INTEGER,
  category_name VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.featured_image_url,
    bp.published_at,
    bp.reading_time_minutes,
    bc.name as category_name
  FROM blog_posts bp
  JOIN blog_categories bc ON bp.category_id = bc.id
  WHERE bp.status = 'published'
  ORDER BY bp.published_at DESC, bp.featured DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get related posts
CREATE OR REPLACE FUNCTION get_related_posts(post_slug TEXT, limit_count INTEGER DEFAULT 3)
RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  slug VARCHAR(255),
  excerpt TEXT,
  featured_image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  reading_time_minutes INTEGER,
  category_name VARCHAR(255)
) AS $$
DECLARE
  current_post_id UUID;
  current_category_id UUID;
BEGIN
  -- Get the current post's ID and category
  SELECT bp.id, bp.category_id INTO current_post_id, current_category_id
  FROM blog_posts bp
  WHERE bp.slug = post_slug AND bp.status = 'published';
  
  -- If post not found, return empty result
  IF current_post_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return related posts from the same category, excluding the current post
  RETURN QUERY
  SELECT 
    bp.id,
    bp.title,
    bp.slug,
    bp.excerpt,
    bp.featured_image_url,
    bp.published_at,
    bp.reading_time_minutes,
    bc.name as category_name
  FROM blog_posts bp
  JOIN blog_categories bc ON bp.category_id = bc.id
  WHERE bp.status = 'published'
    AND bp.id != current_post_id
    AND bp.category_id = current_category_id
  ORDER BY bp.published_at DESC
  LIMIT limit_count;
  
  -- If we don't have enough posts from the same category, fill with other posts
  IF (SELECT COUNT(*) FROM blog_posts WHERE status = 'published' AND id != current_post_id AND category_id = current_category_id) < limit_count THEN
    RETURN QUERY
    SELECT 
      bp.id,
      bp.title,
      bp.slug,
      bp.excerpt,
      bp.featured_image_url,
      bp.published_at,
      bp.reading_time_minutes,
      bc.name as category_name
    FROM blog_posts bp
    JOIN blog_categories bc ON bp.category_id = bc.id
    WHERE bp.status = 'published'
      AND bp.id != current_post_id
      AND bp.category_id != current_category_id
    ORDER BY bp.published_at DESC
    LIMIT (limit_count - (SELECT COUNT(*) FROM blog_posts WHERE status = 'published' AND id != current_post_id AND category_id = current_category_id));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION increment_post_views(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_posts(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_related_posts(TEXT, INTEGER) TO authenticated;

-- Grant execute permissions to anonymous users (for public blog access)
GRANT EXECUTE ON FUNCTION increment_post_views(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_popular_posts(INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION get_related_posts(TEXT, INTEGER) TO anon;