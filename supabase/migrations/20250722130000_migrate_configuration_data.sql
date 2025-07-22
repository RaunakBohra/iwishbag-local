-- Migration: Migrate Configuration Data to Unified Structure
-- This migration moves data from fragmented configuration tables to unified application_configuration

-- ============================================================================
-- Step 1: Migrate Country Settings
-- ============================================================================

-- Migrate existing country settings to unified configuration
INSERT INTO application_configuration (
    category,
    config_key,
    config_data,
    metadata,
    is_active,
    priority,
    created_at,
    updated_at
)
SELECT 
    'country'::VARCHAR(30) as category,
    code as config_key,
    jsonb_build_object(
        'name', COALESCE(name, initcap(code)),
        'currency', currency,
        'symbol', symbol,
        'rate_from_usd', COALESCE(rate_from_usd, 1.0),
        'minimum_payment_amount', COALESCE(minimum_payment_amount, 1.0),
        'customs_percent', COALESCE(customs_percent, 10.0),
        'vat_percent', COALESCE(vat_percent, 0.0),
        'payment_gateway_fixed_fee', COALESCE(payment_gateway_fixed_fee, 0.30),
        'payment_gateway_percent_fee', COALESCE(payment_gateway_percent_fee, 2.9),
        'supported_gateways', CASE 
            WHEN code IN ('US', 'CA', 'GB', 'AU', 'DE', 'FR') THEN '["stripe", "paypal"]'::jsonb
            WHEN code IN ('IN', 'NP') THEN '["payu", "razorpay"]'::jsonb
            ELSE '["stripe"]'::jsonb
        END,
        'shipping_zones', CASE 
            WHEN code = 'US' THEN '["domestic", "international"]'::jsonb
            ELSE '["international"]'::jsonb
        END,
        'business_hours', jsonb_build_object(
            'timezone', CASE 
                WHEN code = 'US' THEN 'America/New_York'
                WHEN code = 'GB' THEN 'Europe/London'
                WHEN code = 'IN' THEN 'Asia/Kolkata'
                WHEN code = 'AU' THEN 'Australia/Sydney'
                WHEN code = 'JP' THEN 'Asia/Tokyo'
                ELSE 'UTC'
            END,
            'weekdays', '09:00-17:00',
            'weekend', false
        )
    ) as config_data,
    jsonb_build_object(
        'migrated_from', 'country_settings',
        'migration_date', now(),
        'original_data', row_to_json(cs.*)
    ) as metadata,
    COALESCE(is_active, true) as is_active,
    -- Set priority based on importance (major markets first)
    CASE 
        WHEN code IN ('US', 'IN', 'GB') THEN 100
        WHEN code IN ('CA', 'AU', 'DE', 'FR', 'JP') THEN 90
        WHEN code IN ('NP', 'SG', 'AE') THEN 80
        ELSE 50
    END as priority,
    COALESCE(created_at, now()) as created_at,
    COALESCE(updated_at, now()) as updated_at
FROM country_settings cs
WHERE EXISTS (SELECT 1 FROM country_settings)
ON CONFLICT (category, config_key) DO UPDATE SET
    config_data = EXCLUDED.config_data,
    metadata = EXCLUDED.metadata,
    updated_at = now();

-- ============================================================================
-- Step 2: Migrate Calculation Defaults
-- ============================================================================

-- Migrate calculation defaults to unified configuration
INSERT INTO application_configuration (
    category,
    config_key,
    config_data,
    metadata,
    is_active,
    priority,
    created_at,
    updated_at
)
SELECT 
    'calculation'::VARCHAR(30) as category,
    'defaults' as config_key,
    jsonb_build_object(
        'default_handling_charge_percent', COALESCE(default_handling_charge_percent, 5.0),
        'default_insurance_percent', COALESCE(default_insurance_percent, 2.0),
        'default_customs_percentage', COALESCE(default_customs_percentage, 10.0),
        'default_domestic_shipping', COALESCE(default_domestic_shipping, 5.0),
        'weight_estimation_multiplier', COALESCE(weight_estimation_multiplier, 1.2),
        'volume_weight_divisor', COALESCE(volume_weight_divisor, 5000),
        'min_declared_value', COALESCE(min_declared_value, 1.0),
        'max_declared_value', COALESCE(max_declared_value, 2500.0),
        -- Additional calculation settings
        'currency_conversion_buffer', 0.02, -- 2% buffer for rate fluctuations
        'auto_round_amounts', true,
        'decimal_places', 2
    ) as config_data,
    jsonb_build_object(
        'migrated_from', 'calculation_defaults',
        'migration_date', now(),
        'original_data', row_to_json(cd.*)
    ) as metadata,
    true as is_active,
    100 as priority, -- Highest priority for calculation defaults
    COALESCE(created_at, now()) as created_at,
    COALESCE(updated_at, now()) as updated_at
FROM calculation_defaults cd
WHERE EXISTS (SELECT 1 FROM calculation_defaults)
LIMIT 1 -- Only take the first/latest record
ON CONFLICT (category, config_key) DO UPDATE SET
    config_data = EXCLUDED.config_data,
    metadata = EXCLUDED.metadata,
    updated_at = now();

-- If no calculation_defaults table exists, create default values
INSERT INTO application_configuration (
    category,
    config_key,
    config_data,
    metadata,
    is_active,
    priority,
    created_at,
    updated_at
)
SELECT 
    'calculation'::VARCHAR(30) as category,
    'defaults' as config_key,
    jsonb_build_object(
        'default_handling_charge_percent', 5.0,
        'default_insurance_percent', 2.0,
        'default_customs_percentage', 10.0,
        'default_domestic_shipping', 5.0,
        'weight_estimation_multiplier', 1.2,
        'volume_weight_divisor', 5000,
        'min_declared_value', 1.0,
        'max_declared_value', 2500.0,
        'currency_conversion_buffer', 0.02,
        'auto_round_amounts', true,
        'decimal_places', 2
    ) as config_data,
    jsonb_build_object(
        'created_from', 'default_values',
        'migration_date', now()
    ) as metadata,
    true as is_active,
    100 as priority,
    now() as created_at,
    now() as updated_at
WHERE NOT EXISTS (
    SELECT 1 FROM application_configuration 
    WHERE category = 'calculation' AND config_key = 'defaults'
)
ON CONFLICT (category, config_key) DO NOTHING;

-- ============================================================================
-- Step 3: Migrate System Settings (if exists)
-- ============================================================================

-- Create default system configuration
INSERT INTO application_configuration (
    category,
    config_key,
    config_data,
    metadata,
    is_active,
    priority,
    created_at,
    updated_at
)
VALUES (
    'system',
    'main',
    jsonb_build_object(
        'maintenance_mode', false,
        'max_quote_items', 50,
        'quote_expiry_days', 30,
        'auto_archive_days', 90,
        'rate_limit', jsonb_build_object(
            'quotes_per_hour', 10,
            'api_calls_per_minute', 60
        ),
        'feature_flags', jsonb_build_object(
            'advanced_calculator', true,
            'ml_weight_prediction', false,
            'auto_assignment', true,
            'unified_support', true,
            'unified_config', true,
            'quote_sharing', true,
            'sla_tracking', true
        ),
        'notifications', jsonb_build_object(
            'email_enabled', true,
            'sms_enabled', false,
            'push_enabled', true,
            'webhook_enabled', true
        )
    ),
    jsonb_build_object(
        'created_from', 'migration_defaults',
        'migration_date', now()
    ),
    true,
    100,
    now(),
    now()
)
ON CONFLICT (category, config_key) DO UPDATE SET
    config_data = EXCLUDED.config_data || application_configuration.config_data, -- Merge with existing
    updated_at = now();

-- ============================================================================
-- Step 4: Migrate Reply Templates (if exists)
-- ============================================================================

-- Migrate reply templates to unified configuration
INSERT INTO application_configuration (
    category,
    config_key,
    config_data,
    metadata,
    is_active,
    priority,
    created_at,
    updated_at
)
SELECT 
    'template'::VARCHAR(30) as category,
    LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '_', 'g')) as config_key,
    jsonb_build_object(
        'name', name,
        'subject', subject,
        'content', content,
        'template_type', 'email', -- Default to email
        'variables', COALESCE(variables, '[]'::jsonb),
        'category', COALESCE(category, 'general'),
        'is_active', COALESCE(is_active, true),
        'usage_count', COALESCE(usage_count, 0),
        'last_used', last_used
    ) as config_data,
    jsonb_build_object(
        'migrated_from', 'reply_templates',
        'migration_date', now(),
        'original_id', id,
        'original_data', row_to_json(rt.*)
    ) as metadata,
    COALESCE(is_active, true) as is_active,
    -- Priority based on usage count
    CASE 
        WHEN usage_count > 100 THEN 100
        WHEN usage_count > 50 THEN 90
        WHEN usage_count > 10 THEN 80
        ELSE 50
    END as priority,
    COALESCE(created_at, now()) as created_at,
    COALESCE(updated_at, now()) as updated_at
FROM reply_templates rt
WHERE EXISTS (SELECT 1 FROM reply_templates)
ON CONFLICT (category, config_key) DO UPDATE SET
    config_data = EXCLUDED.config_data,
    metadata = EXCLUDED.metadata,
    updated_at = now();

-- Create some default templates if none exist
INSERT INTO application_configuration (category, config_key, config_data, is_active, priority)
VALUES 
    ('template', 'welcome_email', 
     '{"name": "Welcome Email", "subject": "Welcome to iwishBag", "content": "Dear {{customer_name}},\n\nWelcome to iwishBag! Your quote {{quote_id}} has been created.\n\nBest regards,\niwishBag Team", "template_type": "email", "variables": ["customer_name", "quote_id"], "category": "welcome", "is_active": true, "usage_count": 0}', 
     true, 90),
    ('template', 'quote_approved', 
     '{"name": "Quote Approved", "subject": "Your quote has been approved", "content": "Dear {{customer_name}},\n\nGreat news! Your quote {{quote_id}} for {{total_amount}} has been approved.\n\nYou can now proceed with payment.\n\nBest regards,\niwishBag Team", "template_type": "email", "variables": ["customer_name", "quote_id", "total_amount"], "category": "quote", "is_active": true, "usage_count": 0}', 
     true, 95),
    ('template', 'payment_received', 
     '{"name": "Payment Received", "subject": "Payment confirmed - Order in process", "content": "Dear {{customer_name}},\n\nWe have received your payment for quote {{quote_id}}.\n\nYour order is now being processed.\n\nBest regards,\niwishBag Team", "template_type": "email", "variables": ["customer_name", "quote_id"], "category": "payment", "is_active": true, "usage_count": 0}', 
     true, 95)
ON CONFLICT (category, config_key) DO NOTHING;

-- ============================================================================
-- Step 5: Create Payment Gateway Configurations
-- ============================================================================

-- Create payment gateway configurations
INSERT INTO application_configuration (category, config_key, config_data, metadata, is_active, priority)
VALUES 
    ('gateway', 'stripe', 
     '{"gateway_name": "stripe", "display_name": "Credit Card (Stripe)", "is_active": true, "supported_currencies": ["USD", "EUR", "GBP", "AUD", "CAD", "JPY"], "supported_countries": ["US", "CA", "GB", "AU", "DE", "FR", "JP", "SG"], "api_config": {"webhook_endpoint": "/webhook/stripe", "supported_payment_methods": ["card", "apple_pay", "google_pay"]}, "fees": {"fixed_fee": 0.30, "percent_fee": 2.9, "international_fee": 1.5}, "limits": {"min_amount": 0.50, "max_amount": 999999.99}}', 
     '{"created_from": "migration_defaults"}', true, 100),
    ('gateway', 'paypal', 
     '{"gateway_name": "paypal", "display_name": "PayPal", "is_active": true, "supported_currencies": ["USD", "EUR", "GBP", "AUD", "CAD", "JPY"], "supported_countries": ["US", "CA", "GB", "AU", "DE", "FR", "JP"], "api_config": {"webhook_endpoint": "/webhook/paypal", "supported_payment_methods": ["paypal_balance", "paypal_credit"]}, "fees": {"fixed_fee": 0.30, "percent_fee": 2.9, "international_fee": 1.5}, "limits": {"min_amount": 1.00, "max_amount": 10000.00}}', 
     '{"created_from": "migration_defaults"}', true, 90),
    ('gateway', 'payu', 
     '{"gateway_name": "payu", "display_name": "PayU (India)", "is_active": true, "supported_currencies": ["INR"], "supported_countries": ["IN"], "api_config": {"webhook_endpoint": "/webhook/payu", "supported_payment_methods": ["card", "net_banking", "upi", "wallet"]}, "fees": {"fixed_fee": 2.00, "percent_fee": 2.5, "international_fee": 0.0}, "limits": {"min_amount": 10.00, "max_amount": 1000000.00}}', 
     '{"created_from": "migration_defaults"}', true, 95),
    ('gateway', 'razorpay', 
     '{"gateway_name": "razorpay", "display_name": "Razorpay (India)", "is_active": false, "supported_currencies": ["INR"], "supported_countries": ["IN"], "api_config": {"webhook_endpoint": "/webhook/razorpay", "supported_payment_methods": ["card", "net_banking", "upi", "wallet"]}, "fees": {"fixed_fee": 0.00, "percent_fee": 2.0, "international_fee": 0.0}, "limits": {"min_amount": 1.00, "max_amount": 1500000.00}}', 
     '{"created_from": "migration_defaults"}', true, 80)
ON CONFLICT (category, config_key) DO NOTHING;

-- ============================================================================
-- Step 6: Update Statistics and Verification
-- ============================================================================

-- Create a temporary table to track migration stats
CREATE TEMP TABLE config_migration_stats AS
SELECT 
    category,
    COUNT(*) as migrated_count,
    string_agg(config_key, ', ' ORDER BY config_key) as sample_keys
FROM application_configuration
GROUP BY category
ORDER BY category;

-- Log migration results
DO $$
DECLARE
    stat_record RECORD;
    total_configs INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'CONFIGURATION MIGRATION RESULTS';
    RAISE NOTICE '============================================================================';
    
    FOR stat_record IN SELECT * FROM config_migration_stats LOOP
        RAISE NOTICE '% - Count: %, Sample Keys: %', 
            UPPER(stat_record.category), 
            stat_record.migrated_count,
            CASE 
                WHEN LENGTH(stat_record.sample_keys) > 100 THEN 
                    LEFT(stat_record.sample_keys, 100) || '...'
                ELSE stat_record.sample_keys
            END;
        
        total_configs := total_configs + stat_record.migrated_count;
    END LOOP;
    
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'TOTAL CONFIGURATIONS: %', total_configs;
    RAISE NOTICE '============================================================================';
    
    -- Verify key data integrity
    IF EXISTS (SELECT 1 FROM application_configuration WHERE category = 'country') THEN
        RAISE NOTICE '✅ Country configurations migrated successfully';
    ELSE
        RAISE NOTICE '⚠️  No country configurations found';
    END IF;
    
    IF EXISTS (SELECT 1 FROM application_configuration WHERE category = 'calculation') THEN
        RAISE NOTICE '✅ Calculation defaults migrated successfully';
    ELSE
        RAISE NOTICE '⚠️  No calculation defaults found';
    END IF;
    
    IF EXISTS (SELECT 1 FROM application_configuration WHERE category = 'system') THEN
        RAISE NOTICE '✅ System configuration created successfully';
    ELSE
        RAISE NOTICE '⚠️  No system configuration found';
    END IF;
    
    IF EXISTS (SELECT 1 FROM application_configuration WHERE category = 'gateway') THEN
        RAISE NOTICE '✅ Gateway configurations created successfully';
    ELSE
        RAISE NOTICE '⚠️  No gateway configurations found';
    END IF;
END $$;

-- Clean up
DROP TABLE IF EXISTS config_migration_stats;

-- ============================================================================
-- Step 7: Create Additional Indexes for Migrated Data
-- ============================================================================

-- Create specific indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_app_config_country_active ON application_configuration(config_key, is_active) 
WHERE category = 'country';

CREATE INDEX IF NOT EXISTS idx_app_config_gateway_supported_countries ON application_configuration 
USING gin ((config_data->'supported_countries')) WHERE category = 'gateway';

CREATE INDEX IF NOT EXISTS idx_app_config_template_category ON application_configuration 
USING gin ((config_data->'category')) WHERE category = 'template';

-- ============================================================================
-- Step 8: Add Comments for Migration Documentation
-- ============================================================================

COMMENT ON TABLE application_configuration IS 'Unified configuration system - consolidated from country_settings, calculation_defaults, system_settings, reply_templates';

-- Add function to verify migration integrity
CREATE OR REPLACE FUNCTION verify_configuration_migration()
RETURNS TABLE(category VARCHAR, status TEXT, details TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ac.category::VARCHAR,
        CASE 
            WHEN COUNT(*) > 0 THEN 'SUCCESS'
            ELSE 'MISSING'
        END as status,
        format('%s configurations migrated', COUNT(*)) as details
    FROM application_configuration ac
    GROUP BY ac.category
    
    UNION ALL
    
    SELECT 
        'validation'::VARCHAR as category,
        CASE 
            WHEN COUNT(*) = 0 THEN 'SUCCESS'
            ELSE 'WARNING'
        END as status,
        format('%s invalid configurations found', COUNT(*)) as details
    FROM application_configuration
    WHERE config_data = '{}'::jsonb OR config_data IS NULL;
END;
$$ LANGUAGE plpgsql;