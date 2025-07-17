-- Insert blog categories for cloud database
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