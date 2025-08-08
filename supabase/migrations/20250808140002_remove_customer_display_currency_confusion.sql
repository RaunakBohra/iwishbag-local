-- Migration: Remove confusing total_customer_display_currency column
--
-- Simplifies the schema by removing redundant currency conversion in DB
-- Applications should use origin currency + real-time conversion instead
--
-- Author: Claude Code Assistant  
-- Date: 2025-08-08

-- Step 1: Update any views that reference the column
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
    total_quote_origincurrency,  -- Only origin currency stored
    customer_currency,           -- For reference, but apps should use user profile
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

COMMENT ON VIEW active_quotes IS 'Active quotes with simplified currency (origin only) - updated 2025-08-08';

-- Step 2: Update quote_options_analytics view  
DROP VIEW IF EXISTS quote_options_analytics CASCADE;
CREATE VIEW quote_options_analytics AS
SELECT 
    id,
    customer_id,
    customer_email,
    status,
    origin_country,
    destination_country,
    total_quote_origincurrency,  -- Only origin currency
    customer_currency,           -- For reference only
    created_at,
    approved_at,
    applied_discounts,
    selected_shipping_option_id,
    insurance_required,
    options_last_updated_at,
    options_last_updated_by
FROM quotes_v2
WHERE status IN ('sent', 'approved', 'paid');

COMMENT ON VIEW quote_options_analytics IS 'Quote analytics with simplified currency (origin only) - updated 2025-08-08';

-- Step 3: Update quotes_with_legacy_fields view (remove legacy references)
DROP VIEW IF EXISTS quotes_with_legacy_fields CASCADE;  
CREATE VIEW quotes_with_legacy_fields AS
SELECT 
    id,
    customer_id,
    customer_email,
    status,
    origin_country,
    destination_country,
    total_quote_origincurrency,  -- Only origin currency
    customer_currency,           -- For reference only  
    created_at,
    updated_at
FROM quotes_v2;

COMMENT ON VIEW quotes_with_legacy_fields IS 'Legacy compatibility view with simplified currency (origin only) - updated 2025-08-08';

-- Step 4: Remove the confusing column
ALTER TABLE quotes_v2 DROP COLUMN IF EXISTS total_customer_display_currency;

-- Step 5: Add a helpful comment to customer_currency column
COMMENT ON COLUMN quotes_v2.customer_currency IS 
'DEPRECATED: Use user profile preferred_display_currency instead. This field is kept for reference only. Applications should convert from total_quote_origincurrency to user''s preferred currency in real-time using CurrencyService.';

-- Step 6: Verify cleanup
DO $$
BEGIN
    -- Check that confusing column is gone
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes_v2' 
        AND column_name = 'total_customer_display_currency'
    ) THEN
        RAISE EXCEPTION 'Cleanup failed: Confusing currency column still exists';
    END IF;
    
    -- Check that origin currency column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes_v2' 
        AND column_name = 'total_quote_origincurrency'
    ) THEN
        RAISE EXCEPTION 'Safety check failed: Origin currency column missing';
    END IF;
    
    RAISE NOTICE 'SUCCESS: Confusing currency column removed. Apps should now use origin currency + real-time conversion.';
END $$;

-- Final success message
SELECT 'SUCCESS: Database simplified. Use total_quote_origincurrency + CurrencyService for display.' as migration_status;