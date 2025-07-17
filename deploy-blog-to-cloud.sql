-- Deploy blog system to cloud database
-- This script creates all blog tables and initial data

-- Create blog_categories table
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#0088cc',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_tags table
CREATE TABLE IF NOT EXISTS public.blog_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    featured_image_url TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    featured BOOLEAN DEFAULT FALSE,
    reading_time_minutes INTEGER DEFAULT 0,
    category_id UUID NOT NULL REFERENCES public.blog_categories(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meta_title VARCHAR(60),
    meta_description VARCHAR(160),
    og_title VARCHAR(60),
    og_description VARCHAR(160),
    og_image TEXT,
    twitter_title VARCHAR(60),
    twitter_description VARCHAR(160),
    twitter_image TEXT,
    focus_keyword VARCHAR(255),
    canonical_url TEXT,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_post_tags table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.blog_post_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_author ON public.blog_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts(published_at);
CREATE INDEX IF NOT EXISTS idx_blog_categories_slug ON public.blog_categories(slug);
CREATE INDEX IF NOT EXISTS idx_blog_tags_slug ON public.blog_tags(slug);

-- Set up Row Level Security (RLS) policies
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for blog_categories
CREATE POLICY "blog_categories_select_policy" ON public.blog_categories
    FOR SELECT USING (true);

CREATE POLICY "blog_categories_insert_policy" ON public.blog_categories
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "blog_categories_update_policy" ON public.blog_categories
    FOR UPDATE USING (is_admin());

CREATE POLICY "blog_categories_delete_policy" ON public.blog_categories
    FOR DELETE USING (is_admin());

-- RLS policies for blog_tags
CREATE POLICY "blog_tags_select_policy" ON public.blog_tags
    FOR SELECT USING (true);

CREATE POLICY "blog_tags_insert_policy" ON public.blog_tags
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "blog_tags_update_policy" ON public.blog_tags
    FOR UPDATE USING (is_admin());

CREATE POLICY "blog_tags_delete_policy" ON public.blog_tags
    FOR DELETE USING (is_admin());

-- RLS policies for blog_posts
CREATE POLICY "blog_posts_select_policy" ON public.blog_posts
    FOR SELECT USING (
        status = 'published' OR 
        author_id = auth.uid() OR 
        is_admin()
    );

CREATE POLICY "blog_posts_insert_policy" ON public.blog_posts
    FOR INSERT WITH CHECK (
        author_id = auth.uid() OR 
        is_admin()
    );

CREATE POLICY "blog_posts_update_policy" ON public.blog_posts
    FOR UPDATE USING (
        author_id = auth.uid() OR 
        is_admin()
    );

CREATE POLICY "blog_posts_delete_policy" ON public.blog_posts
    FOR DELETE USING (
        author_id = auth.uid() OR 
        is_admin()
    );

-- RLS policies for blog_post_tags
CREATE POLICY "blog_post_tags_select_policy" ON public.blog_post_tags
    FOR SELECT USING (true);

CREATE POLICY "blog_post_tags_insert_policy" ON public.blog_post_tags
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.blog_posts 
            WHERE id = post_id AND (author_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "blog_post_tags_update_policy" ON public.blog_post_tags
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.blog_posts 
            WHERE id = post_id AND (author_id = auth.uid() OR is_admin())
        )
    );

CREATE POLICY "blog_post_tags_delete_policy" ON public.blog_post_tags
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.blog_posts 
            WHERE id = post_id AND (author_id = auth.uid() OR is_admin())
        )
    );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER blog_categories_updated_at_trigger
    BEFORE UPDATE ON public.blog_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER blog_tags_updated_at_trigger
    BEFORE UPDATE ON public.blog_tags
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER blog_posts_updated_at_trigger
    BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert blog categories
INSERT INTO public.blog_categories (name, slug, description, color, display_order)
VALUES 
    ('E-commerce', 'ecommerce', 'Tips and strategies for online shopping and e-commerce', '#0088cc', 1),
    ('International Shopping', 'international-shopping', 'Guide to shopping from international platforms', '#28a745', 2),
    ('Product Reviews', 'product-reviews', 'Detailed reviews of products and services', '#ffc107', 3),
    ('Shopping Tips', 'shopping-tips', 'Money-saving tips and shopping hacks', '#dc3545', 4),
    ('Technology', 'technology', 'Latest tech trends and gadgets', '#6f42c1', 5),
    ('Travel Shopping', 'travel-shopping', 'Shopping while traveling and travel essentials', '#17a2b8', 6),
    ('Fashion & Style', 'fashion-style', 'Latest fashion trends and style guides', '#e83e8c', 7),
    ('Health & Beauty', 'health-beauty', 'Health products and beauty essentials', '#20c997', 8),
    ('Electronics', 'electronics', 'Latest electronics and gadgets', '#fd7e14', 9),
    ('Home & Living', 'home-living', 'Home improvement and lifestyle products', '#6610f2', 10)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    color = EXCLUDED.color,
    display_order = EXCLUDED.display_order;

-- Insert blog tags
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
    ('Savings', 'savings'),
    ('Travel', 'travel'),
    ('Fashion', 'fashion'),
    ('Beauty', 'beauty'),
    ('Electronics', 'electronics'),
    ('Home', 'home'),
    ('Lifestyle', 'lifestyle'),
    ('Health', 'health'),
    ('Fitness', 'fitness'),
    ('Food', 'food'),
    ('Books', 'books')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name;