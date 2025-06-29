-- Check if the table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'route_customs_tiers'
) as table_exists;

-- Check table structure
\d route_customs_tiers;

-- Check all data (bypass RLS)
SELECT * FROM route_customs_tiers;

-- Check US to India specifically
SELECT * FROM route_customs_tiers 
WHERE origin_country = 'US' AND destination_country = 'IN'
ORDER BY priority_order; 