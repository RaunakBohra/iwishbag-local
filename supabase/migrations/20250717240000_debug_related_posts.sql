-- Check if the function exists and what its signature looks like
SELECT 
    p.proname AS function_name,
    pg_catalog.pg_get_function_result(p.oid) AS return_type,
    pg_catalog.pg_get_function_arguments(p.oid) AS arguments
FROM pg_catalog.pg_proc p
LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'get_related_posts'
AND n.nspname = 'public';

-- Also check if we have any blog posts
SELECT slug, title, status FROM blog_posts WHERE status = 'published' LIMIT 5;