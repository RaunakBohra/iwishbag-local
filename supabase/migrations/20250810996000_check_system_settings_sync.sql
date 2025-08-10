-- ============================================================================
-- CHECK SYSTEM SETTINGS SYNC BETWEEN LOCAL AND CLOUD
-- This will show what system_settings exist in the cloud database
-- ============================================================================

DO $$
DECLARE
    settings_count INTEGER;
    setting_record RECORD;
BEGIN
    -- Count total settings
    SELECT COUNT(*) INTO settings_count FROM public.system_settings;
    
    RAISE NOTICE '=== CLOUD DATABASE SYSTEM_SETTINGS ANALYSIS ===';
    RAISE NOTICE 'Total system_settings records: %', settings_count;
    RAISE NOTICE '';
    
    -- List all settings
    FOR setting_record IN 
        SELECT setting_key, LEFT(setting_value::TEXT, 50) as preview, description 
        FROM public.system_settings 
        ORDER BY setting_key
    LOOP
        RAISE NOTICE '% = % | %', 
            setting_record.setting_key, 
            setting_record.preview, 
            COALESCE(setting_record.description, 'No description');
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== KEY SETTINGS CHECK ===';
    
    -- Check specific important settings
    FOR setting_record IN 
        SELECT setting_key, setting_value::TEXT as setting_value 
        FROM public.system_settings 
        WHERE setting_key IN ('app_name', 'site_name', 'support_email', 'default_currency')
        ORDER BY setting_key
    LOOP
        RAISE NOTICE 'IMPORTANT: % = %', setting_record.setting_key, setting_record.setting_value;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ CLOUD DATABASE SYSTEM_SETTINGS CHECK COMPLETE!';
END $$;