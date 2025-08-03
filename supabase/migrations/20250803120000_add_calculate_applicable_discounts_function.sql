-- Migration: Add calculate_applicable_discounts function
-- Created: 2025-08-03 12:00:00
-- Purpose: Fix DiscountService errors by providing the missing RPC function

-- Drop existing function if it exists with wrong signature
DROP FUNCTION IF EXISTS calculate_applicable_discounts(uuid, numeric, numeric, text, text);

-- Create the calculate_applicable_discounts function with correct signature
CREATE OR REPLACE FUNCTION calculate_applicable_discounts(
    p_customer_id UUID,
    p_quote_total NUMERIC,
    p_handling_fee NUMERIC,
    p_payment_method TEXT,
    p_country_code TEXT
)
RETURNS TABLE(
    discount_id UUID,
    discount_code TEXT,
    discount_type TEXT,
    value NUMERIC,
    applicable_amount NUMERIC,
    discount_amount NUMERIC,
    priority INTEGER
) AS $$
BEGIN
    -- Return applicable discounts based on actual schema
    RETURN QUERY
    SELECT 
        dc.id as discount_id,
        dc.code as discount_code,
        dt.type as discount_type,
        dt.value,
        CASE 
            WHEN dt.type = 'percentage' THEN p_quote_total
            WHEN dt.type = 'fixed_amount' THEN LEAST(dt.value, p_quote_total)
            WHEN dt.type = 'handling_fee' THEN p_handling_fee
            ELSE 0
        END as applicable_amount,
        CASE 
            WHEN dt.type = 'percentage' THEN (p_quote_total * dt.value / 100)
            WHEN dt.type = 'fixed_amount' THEN LEAST(dt.value, p_quote_total)
            WHEN dt.type = 'handling_fee' THEN LEAST(dt.value, p_handling_fee)
            ELSE 0
        END as discount_amount,
        dt.priority
    FROM discount_codes dc
    JOIN discount_types dt ON dc.discount_type_id = dt.id
    LEFT JOIN country_discount_rules cdr ON dt.id = cdr.discount_type_id
    WHERE dc.is_active = true
    AND dt.is_active = true
    AND dc.valid_from <= CURRENT_TIMESTAMP
    AND (dc.valid_until IS NULL OR dc.valid_until >= CURRENT_TIMESTAMP)
    AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
    AND (
        -- Check country rules if they exist
        cdr.country_code IS NULL 
        OR cdr.country_code = p_country_code
        OR NOT EXISTS (SELECT 1 FROM country_discount_rules WHERE discount_type_id = dt.id)
    )
    AND (
        -- Check conditions from discount_types.conditions
        dt.conditions IS NULL 
        OR dt.conditions = '{}'::jsonb
        OR (
            (dt.conditions->>'min_order_amount')::numeric IS NULL 
            OR p_quote_total >= (dt.conditions->>'min_order_amount')::numeric
        )
        AND (
            (dt.conditions->>'max_order_amount')::numeric IS NULL 
            OR p_quote_total <= (dt.conditions->>'max_order_amount')::numeric
        )
        AND (
            (dt.conditions->>'payment_methods') IS NULL
            OR p_payment_method = ANY(ARRAY(SELECT jsonb_array_elements_text(dt.conditions->'payment_methods')))
        )
    )
    ORDER BY dt.priority ASC, dt.value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_applicable_discounts(UUID, NUMERIC, NUMERIC, TEXT, TEXT) IS 
'Calculates applicable discounts for a quote based on customer, quote total, handling fee, payment method, and country. 
Used by DiscountService to determine which discounts can be applied to a quote.';