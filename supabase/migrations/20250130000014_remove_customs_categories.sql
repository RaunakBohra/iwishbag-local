-- Remove customs_categories table
-- This table is redundant as the HSN system provides more detailed and accurate customs duty information

-- Drop the table (this will automatically drop all constraints, indexes, and policies)
DROP TABLE IF EXISTS public.customs_categories CASCADE;