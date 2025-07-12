-- Rollback cloud database to commit f4369a9 state
-- This removes all database objects created after migration 20250712070000

-- Drop tables created by blog system migrations (20250712000001-20250712000003)
DROP TABLE IF EXISTS public.blog_post_views CASCADE;
DROP TABLE IF EXISTS public.blog_post_categories CASCADE;
DROP TABLE IF EXISTS public.blog_comments CASCADE;
DROP TABLE IF EXISTS public.blog_posts CASCADE;
DROP TABLE IF EXISTS public.blog_categories CASCADE;
DROP TABLE IF EXISTS public.blog_authors CASCADE;

-- Drop PayPal payment links tables (20250712080000)
DROP TABLE IF EXISTS public.paypal_link_payments CASCADE;
DROP TABLE IF EXISTS public.paypal_payment_links CASCADE;
DROP VIEW IF EXISTS public.paypal_payment_links_summary CASCADE;

-- Drop functions that may have been added
DROP FUNCTION IF EXISTS public.generate_payment_link_code() CASCADE;
DROP FUNCTION IF EXISTS public.update_payment_links_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.expire_old_payment_links() CASCADE;
DROP FUNCTION IF EXISTS public.update_payment_link_status() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_read_time(text) CASCADE;
DROP FUNCTION IF EXISTS public.generate_slug(text) CASCADE;
DROP FUNCTION IF EXISTS public.update_blog_posts_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_blog_categories_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_blog_post_read_time() CASCADE;

-- Clean up any remaining blog-related sequences
DROP SEQUENCE IF EXISTS public.blog_authors_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.blog_categories_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.blog_posts_id_seq CASCADE;

-- Clean up PayPal payment links sequences
DROP SEQUENCE IF EXISTS public.paypal_payment_links_id_seq CASCADE;

-- Remove any new columns that were added to existing tables
-- (These would need to be identified from the specific migrations)

-- Clean up migration history for reverted migrations
DELETE FROM supabase_migrations.schema_migrations 
WHERE version IN (
  '20250711224602',
  '20250711225245', 
  '20250712000001',
  '20250712000002',
  '20250712000003',
  '20250712065028',
  '20250712080000',
  '20250712400000'
);

-- Verify that we're at the correct migration state
SELECT 'Migration rollback completed. Latest migration should be: 20250712070000' as status;
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;