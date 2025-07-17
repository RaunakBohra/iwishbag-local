-- Add SEO fields to blog_posts table
-- This migration adds OpenGraph, Twitter Card, and SEO analysis fields

ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS og_title VARCHAR(60),
ADD COLUMN IF NOT EXISTS og_description VARCHAR(160),
ADD COLUMN IF NOT EXISTS og_image TEXT,
ADD COLUMN IF NOT EXISTS twitter_title VARCHAR(60),
ADD COLUMN IF NOT EXISTS twitter_description VARCHAR(160),
ADD COLUMN IF NOT EXISTS twitter_image TEXT,
ADD COLUMN IF NOT EXISTS focus_keyword VARCHAR(255),
ADD COLUMN IF NOT EXISTS canonical_url TEXT;

-- Add comments explaining the fields
COMMENT ON COLUMN public.blog_posts.og_title IS 'OpenGraph title for social media sharing';
COMMENT ON COLUMN public.blog_posts.og_description IS 'OpenGraph description for social media sharing';
COMMENT ON COLUMN public.blog_posts.og_image IS 'OpenGraph image URL for social media sharing';
COMMENT ON COLUMN public.blog_posts.twitter_title IS 'Twitter Card title';
COMMENT ON COLUMN public.blog_posts.twitter_description IS 'Twitter Card description';
COMMENT ON COLUMN public.blog_posts.twitter_image IS 'Twitter Card image URL';
COMMENT ON COLUMN public.blog_posts.focus_keyword IS 'Primary keyword for SEO analysis';
COMMENT ON COLUMN public.blog_posts.canonical_url IS 'Canonical URL to prevent duplicate content issues';

-- Update existing posts to have default values
UPDATE public.blog_posts 
SET 
  og_title = COALESCE(meta_title, title),
  og_description = COALESCE(meta_description, excerpt),
  twitter_title = COALESCE(meta_title, title),
  twitter_description = COALESCE(meta_description, excerpt),
  canonical_url = CONCAT('https://iwishbag.com/blog/', slug)
WHERE og_title IS NULL;

-- Create index for better performance on canonical URLs
CREATE INDEX IF NOT EXISTS idx_blog_posts_canonical_url ON public.blog_posts(canonical_url);

-- Create index for focus keyword searches
CREATE INDEX IF NOT EXISTS idx_blog_posts_focus_keyword ON public.blog_posts(focus_keyword);