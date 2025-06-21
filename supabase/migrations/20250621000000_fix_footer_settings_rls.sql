-- Fix RLS policies for footer_settings table to allow updates
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.footer_settings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.footer_settings;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.footer_settings;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.footer_settings;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.footer_settings;
DROP POLICY IF EXISTS "Enable update for all users" ON public.footer_settings;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.footer_settings;

-- Enable RLS
ALTER TABLE public.footer_settings ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations for development
CREATE POLICY "Enable read access for all users" ON public.footer_settings
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON public.footer_settings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON public.footer_settings
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON public.footer_settings
    FOR DELETE USING (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'footer_settings'; 