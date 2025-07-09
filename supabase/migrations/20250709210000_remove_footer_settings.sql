-- Remove footer_settings table and related functionality
-- This resolves the 406 errors caused by querying an unused table

-- Drop all RLS policies on footer_settings first
DROP POLICY IF EXISTS "Enable read access for all users" ON public.footer_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.footer_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.footer_settings;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.footer_settings;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.footer_settings;
DROP POLICY IF EXISTS "Enable update for all users" ON public.footer_settings;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.footer_settings;

-- Drop the footer_settings table
DROP TABLE IF EXISTS public.footer_settings CASCADE;

-- Remove footer_settings from seed data cleanup
-- (This will be handled by updating the seed.sql file)