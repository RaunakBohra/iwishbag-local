-- Remove delivery_rate_cache table and related objects
-- This caching system is not currently used and can be re-added later when needed

-- Drop the table (this will automatically drop the index and policies)
DROP TABLE IF EXISTS public.delivery_rate_cache CASCADE;

-- Remove the index that was created for this table
DROP INDEX IF EXISTS idx_delivery_rate_cache_lookup;

-- Note: The table was designed for caching delivery provider rates to improve performance
-- but is currently unused and empty. It can be re-added later when performance optimization is needed.