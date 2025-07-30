-- Remove HSN (Harmonized System of Nomenclature) system tables, views, and functions
-- This includes hsn_master, hsn_search_optimized, and related functions

-- Drop functions first (to avoid dependency issues)
DROP FUNCTION IF EXISTS public.get_hsn_with_currency_conversion(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_hsn_search_cache() CASCADE;

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS public.hsn_search_optimized CASCADE;

-- Drop tables
DROP TABLE IF EXISTS public.hsn_master CASCADE;
DROP TABLE IF EXISTS public.user_hsn_requests CASCADE;

-- Note: HSN system was used for tax classification but has been replaced 
-- with direct tax calculation methods in the application logic.