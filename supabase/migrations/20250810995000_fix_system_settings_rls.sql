-- ============================================================================
-- FIX SYSTEM_SETTINGS RLS POLICIES
-- Enable RLS and create policies for system_settings table
-- ============================================================================

-- Enable RLS on system_settings table
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can view all system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admin can insert system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admin can update system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admin can delete system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Users can view public system settings" ON public.system_settings;

-- Admin policies - full access to system_settings
CREATE POLICY "Admin can view all system settings" ON public.system_settings
    FOR SELECT 
    TO authenticated
    USING (is_admin());

CREATE POLICY "Admin can insert system settings" ON public.system_settings
    FOR INSERT 
    TO authenticated
    WITH CHECK (is_admin());

CREATE POLICY "Admin can update system settings" ON public.system_settings
    FOR UPDATE 
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Admin can delete system settings" ON public.system_settings
    FOR DELETE 
    TO authenticated
    USING (is_admin());

-- User policies - read access to public settings only
CREATE POLICY "Users can view public system settings" ON public.system_settings
    FOR SELECT 
    TO authenticated
    USING (
        setting_key IN (
            'app_name',
            'app_version',
            'maintenance_mode',
            'quote_statuses',
            'order_statuses',
            'supported_countries',
            'default_currency',
            'contact_email',
            'support_email'
        )
    );

-- Grant necessary permissions
GRANT SELECT ON public.system_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.system_settings TO service_role;

-- Test policy with sample data
DO $$
BEGIN
    -- Insert some test settings if they don't exist
    INSERT INTO public.system_settings (id, setting_key, setting_value, description)
    VALUES 
        (gen_random_uuid(), 'app_name', 'iwishBag', 'Application name')
    ON CONFLICT (setting_key) DO NOTHING;
    
    INSERT INTO public.system_settings (id, setting_key, setting_value, description)
    VALUES 
        (gen_random_uuid(), 'quote_statuses', '["pending", "sent", "approved", "rejected", "ordered", "shipped", "completed"]', 'Available quote statuses')
    ON CONFLICT (setting_key) DO NOTHING;
    
    RAISE NOTICE '✅ System settings RLS policies configured successfully!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error inserting test data: %', SQLERRM;
END $$;