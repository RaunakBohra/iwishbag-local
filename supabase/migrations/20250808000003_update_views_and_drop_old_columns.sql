-- Migration: Update views to use new currency columns, then drop old ones
-- 
-- Updates database views to use clear currency column names, then safely removes
-- the old confusing columns (total_usd, total_customer_currency)
--
-- Author: Claude Code Assistant  
-- Date: 2025-08-08

-- Step 1: Update views to use new clear column names

-- Drop and recreate active_quotes view with new column names
DROP VIEW IF EXISTS active_quotes CASCADE;
CREATE VIEW active_quotes AS
SELECT 
    id,
    customer_id,
    customer_email,
    customer_name,
    customer_phone,
    quote_number,
    status,
    created_by,
    origin_country,
    destination_country,
    items,
    shipping_method,
    insurance_required,
    calculation_data,
    total_quote_origincurrency,  -- UPDATED: Use clear column name
    total_customer_display_currency,  -- UPDATED: Use clear column name
    customer_currency,
    created_at,
    updated_at,
    calculated_at,
    approved_at,
    admin_notes,
    customer_notes,
    validity_days,
    expires_at,
    sent_at,
    viewed_at,
    reminder_count,
    last_reminder_at,
    share_token,
    customer_message,
    email_sent,
    sms_sent,
    whatsapp_sent,
    preferred_contact,
    version,
    parent_quote_id,
    revision_reason,
    changes_summary,
    payment_terms,
    approval_required,
    approved_by,
    max_discount_percentage,
    minimum_order_value,
    converted_to_order_id,
    original_quote_id,
    external_reference,
    source,
    ip_address,
    user_agent,
    utm_source,
    utm_medium,
    utm_campaign,
    is_latest_version,
    approval_required_above,
    max_discount_allowed,
    api_version,
    (NOT is_quote_expired(id)) AS is_active,
    CASE 
        WHEN expires_at IS NULL THEN NULL::interval
        ELSE (expires_at - NOW())
    END AS time_remaining
FROM quotes_v2 q
WHERE is_latest_version = true;

COMMENT ON VIEW active_quotes IS 'Active quotes with clear currency column names (updated 2025-08-08)';

-- Drop and recreate quote_options_analytics view  
DROP VIEW IF EXISTS quote_options_analytics CASCADE;
CREATE VIEW quote_options_analytics AS
SELECT 
    id,
    customer_id,
    customer_email,
    status,
    origin_country,
    destination_country,
    total_quote_origincurrency,  -- UPDATED: Use clear column name
    total_customer_display_currency,  -- UPDATED: Use clear column name
    customer_currency,
    created_at,
    approved_at,
    applied_discounts,
    selected_shipping_option_id,
    insurance_required,
    options_last_updated_at,
    options_last_updated_by
FROM quotes_v2
WHERE status IN ('sent', 'approved', 'paid');

COMMENT ON VIEW quote_options_analytics IS 'Quote options analytics with clear currency columns (updated 2025-08-08)';

-- Drop and recreate quotes_with_legacy_fields view
DROP VIEW IF EXISTS quotes_with_legacy_fields CASCADE;  
CREATE VIEW quotes_with_legacy_fields AS
SELECT 
    id,
    customer_id,
    customer_email,
    status,
    origin_country,
    destination_country,
    total_quote_origincurrency,  -- UPDATED: Use clear column name
    total_customer_display_currency,  -- UPDATED: Use clear column name
    customer_currency,
    created_at,
    updated_at,
    -- Add computed legacy fields for backward compatibility if needed
    total_quote_origincurrency AS legacy_total_usd,  -- Alias for compatibility
    total_customer_display_currency AS legacy_total_customer_currency  -- Alias for compatibility
FROM quotes_v2;

COMMENT ON VIEW quotes_with_legacy_fields IS 'Legacy compatibility view with clear currency columns (updated 2025-08-08)';

-- Step 2: Now safely drop the old confusing columns
ALTER TABLE quotes_v2 DROP COLUMN IF EXISTS total_usd;
ALTER TABLE quotes_v2 DROP COLUMN IF EXISTS total_customer_currency;

-- Step 3: Verify cleanup was successful
DO $$
BEGIN
    -- Check that old columns are gone
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes_v2' 
        AND column_name IN ('total_usd', 'total_customer_currency')
    ) THEN
        RAISE EXCEPTION 'Cleanup failed: Old currency columns still exist';
    END IF;
    
    -- Check that new columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes_v2' 
        AND column_name = 'total_quote_origincurrency'
    ) THEN
        RAISE EXCEPTION 'Safety check failed: New currency column missing';
    END IF;
    
    RAISE NOTICE 'SUCCESS: Old confusing currency columns removed, views updated to use clear column names';
END $$;

-- Final success message
SELECT 'SUCCESS: Database cleanup complete. All views now use clear currency column names.' as migration_status;