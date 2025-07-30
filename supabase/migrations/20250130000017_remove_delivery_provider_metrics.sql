-- Remove delivery_provider_metrics table and related objects
-- This analytics system is not currently used and adds unnecessary complexity

-- Drop the table (this will automatically drop the index and policies)
DROP TABLE IF EXISTS public.delivery_provider_metrics CASCADE;

-- Remove the index that was created for this table
DROP INDEX IF EXISTS idx_delivery_metrics_lookup;

-- Note: The table was designed for tracking delivery provider performance metrics
-- but is currently unused and empty. It can be re-added later if analytics are needed.