-- Cleanup any remaining customs_categories references from baseline migration
-- This handles the case where the baseline migration was already applied

-- Drop table if it still exists (in case baseline was applied before removal)
DROP TABLE IF EXISTS public.customs_categories CASCADE;

-- Remove any policies that might still exist
DROP POLICY IF EXISTS "Public read access" ON public.customs_categories;

-- Note: The table has been replaced by the HSN system which provides
-- more detailed and accurate customs duty information with 70+ categories
-- compared to the 4 simple categories that customs_categories provided