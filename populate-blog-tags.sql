-- Insert blog tags for cloud database
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