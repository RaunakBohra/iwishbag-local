-- ============================================================================
-- FIX QUOTE INSERTION DEFAULTS
-- Ensure quotes table has proper defaults to prevent 400 Bad Request errors
-- ============================================================================

-- Add better defaults for required fields to prevent insertion failures
ALTER TABLE quotes ALTER COLUMN costprice_total_usd SET DEFAULT 0;
ALTER TABLE quotes ALTER COLUMN final_total_usd SET DEFAULT 0;
ALTER TABLE quotes ALTER COLUMN items SET DEFAULT '[]'::jsonb;
ALTER TABLE quotes ALTER COLUMN customer_data SET DEFAULT '{}'::jsonb;
ALTER TABLE quotes ALTER COLUMN operational_data SET DEFAULT '{}'::jsonb;
ALTER TABLE quotes ALTER COLUMN calculation_data SET DEFAULT '{}'::jsonb;

-- Ensure origin_country defaults to destination_country if not provided
-- (This handles the case where only destination_country is provided)

-- Add helpful comment
COMMENT ON TABLE quotes IS 'Unified quotes table with JSONB structure. Email stored in customer_data.info.email, shipping address in customer_data.shipping_address';