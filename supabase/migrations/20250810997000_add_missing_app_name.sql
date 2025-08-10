-- ============================================================================
-- ADD MISSING APP_NAME SETTING TO CLOUD DATABASE
-- Sync the missing app_name setting from local to cloud
-- ============================================================================

-- Insert the missing app_name setting
INSERT INTO public.system_settings (id, setting_key, setting_value, description, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'app_name',
    '"iwishBag"',
    'Application name',
    NOW(),
    NOW()
)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Verify the setting was added
DO $$
DECLARE
    app_name_value TEXT;
    total_settings INTEGER;
BEGIN
    -- Get the app_name value
    SELECT setting_value::TEXT INTO app_name_value 
    FROM public.system_settings 
    WHERE setting_key = 'app_name';
    
    -- Get total count
    SELECT COUNT(*) INTO total_settings FROM public.system_settings;
    
    RAISE NOTICE '✅ CLOUD DATABASE SYNC COMPLETE!';
    RAISE NOTICE 'app_name setting: %', COALESCE(app_name_value, 'STILL MISSING');
    RAISE NOTICE 'Total settings: %', total_settings;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Now cloud and local databases should have the same app_name!';
END $$;