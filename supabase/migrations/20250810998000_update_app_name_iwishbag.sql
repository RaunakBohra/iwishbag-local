-- ============================================================================
-- UPDATE APP_NAME TO iWishBag (with capital W)
-- Make app_name consistent with site_name
-- ============================================================================

-- Update app_name to match the correct branding
UPDATE public.system_settings 
SET 
    setting_value = '"iWishBag"',
    updated_at = NOW() 
WHERE setting_key = 'app_name';

-- Verify the update
DO $$
DECLARE
    app_name_value TEXT;
    site_name_value TEXT;
BEGIN
    -- Get both values
    SELECT setting_value::TEXT INTO app_name_value 
    FROM public.system_settings 
    WHERE setting_key = 'app_name';
    
    SELECT setting_value::TEXT INTO site_name_value 
    FROM public.system_settings 
    WHERE setting_key = 'site_name';
    
    RAISE NOTICE '✅ APP NAME UPDATED SUCCESSFULLY!';
    RAISE NOTICE 'app_name: %', app_name_value;
    RAISE NOTICE 'site_name: %', site_name_value;
    RAISE NOTICE '';
    
    IF app_name_value = site_name_value THEN
        RAISE NOTICE '🎯 Perfect! app_name and site_name are now consistent!';
    ELSE
        RAISE NOTICE '⚠️  app_name and site_name are different';
    END IF;
END $$;