-- Fix RLS policies for system initialization
-- This migration addresses RLS policy issues preventing system initialization

-- Fix system_settings RLS policies
DROP POLICY IF EXISTS "Admins have full access" ON system_settings;
DROP POLICY IF EXISTS "Allow admins to read system settings" ON system_settings;
DROP POLICY IF EXISTS "Allow service role to manage system settings" ON system_settings;
DROP POLICY IF EXISTS "Enable admin full access to system_settings" ON system_settings;

-- Create comprehensive policies for system_settings
CREATE POLICY "Allow service role full access" ON system_settings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow admins full access" ON system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Allow public read for initialization" ON system_settings
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert for initialization" ON system_settings
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Fix user_addresses table if it has RLS issues
-- Check if user_addresses table exists first
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_addresses') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can only access own addresses" ON user_addresses;
        DROP POLICY IF EXISTS "Users can manage own addresses" ON user_addresses;
        DROP POLICY IF EXISTS "Allow service role full access to addresses" ON user_addresses;
        
        -- Create proper policies for user_addresses
        CREATE POLICY "Users can manage own addresses" ON user_addresses
            FOR ALL USING (user_id = auth.uid());
            
        CREATE POLICY "Allow service role full access to addresses" ON user_addresses
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Ensure exchange_rate_cache has proper policies
DROP POLICY IF EXISTS "Allow public read access to exchange rates" ON exchange_rate_cache;
DROP POLICY IF EXISTS "Allow service role to manage exchange rates" ON exchange_rate_cache;

CREATE POLICY "Allow public read access to exchange rates" ON exchange_rate_cache
    FOR SELECT USING (true);

CREATE POLICY "Allow service role to manage exchange rates" ON exchange_rate_cache
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to insert exchange rates for now (can be restricted later)
CREATE POLICY "Allow authenticated insert to exchange rates" ON exchange_rate_cache
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to check if user has admin role (if not exists)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON system_settings TO anon, authenticated;
GRANT INSERT ON system_settings TO authenticated;
GRANT SELECT ON exchange_rate_cache TO anon, authenticated;
GRANT INSERT ON exchange_rate_cache TO authenticated;