-- Migration: Fix system_settings RLS to allow initialization by anonymous users
-- This is needed for StatusConfigProvider to initialize default settings on app startup

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Allow authenticated insert for initialization" ON system_settings;

-- Create a more permissive insert policy for system initialization
-- This allows both authenticated users and service role to insert system settings
CREATE POLICY "Allow system settings initialization" ON system_settings
    FOR INSERT WITH CHECK (
        -- Allow authenticated users
        auth.uid() IS NOT NULL 
        OR 
        -- Allow when no user is authenticated (for system initialization)
        auth.uid() IS NULL
        OR
        -- Allow service role explicitly
        auth.role() = 'service_role'
    );

-- Also add an update policy in case settings need to be updated during initialization
DROP POLICY IF EXISTS "Allow authenticated update for initialization" ON system_settings;
CREATE POLICY "Allow system settings updates" ON system_settings
    FOR UPDATE USING (
        -- Allow admins
        has_role(auth.uid(), 'admin')
        OR
        -- Allow service role
        auth.role() = 'service_role'
        OR
        -- Allow during initialization (no user context)
        auth.uid() IS NULL
    );

-- Ensure proper permissions are granted
GRANT INSERT, UPDATE ON system_settings TO anon;
GRANT INSERT, UPDATE ON system_settings TO authenticated;

-- Add helpful comment
COMMENT ON POLICY "Allow system settings initialization" ON system_settings IS 
'Allows system settings to be inserted during app initialization, even before user authentication';