-- ============================================================================
-- ORIGIN COUNTRY CURRENCY INTEGRATION MIGRATION
-- Adds support for origin currency throughout the quote system
-- ============================================================================

-- Add origin currency fields to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS origin_currency VARCHAR(3);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS origin_total_amount DECIMAL(12,2);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS apply_sales_tax BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5,4);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sales_tax_rate DECIMAL(5,4);

-- Add currency context to quote items JSONB structure
-- Note: This is handled in application code by updating the items JSONB structure

-- Migrate existing quotes to have origin currency data
UPDATE quotes 
SET 
  origin_currency = 'USD',
  origin_total_amount = final_total_usd
WHERE origin_currency IS NULL;

-- Update existing quotes items structure to use costprice_origin
-- This ensures backward compatibility
UPDATE quotes 
SET items = (
  SELECT jsonb_agg(
    CASE 
      WHEN item ? 'costprice_origin' THEN item
      ELSE item || jsonb_build_object('costprice_origin', COALESCE((item->>'unit_price_usd')::numeric, 0))
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE items IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS item 
    WHERE NOT (item ? 'costprice_origin')
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_origin_currency ON quotes(origin_currency);
CREATE INDEX IF NOT EXISTS idx_quotes_origin_country ON quotes(origin_country);

-- Add comments for documentation
COMMENT ON COLUMN quotes.origin_currency IS 'Currency code for the origin country (INR, USD, NPR, etc.)';
COMMENT ON COLUMN quotes.origin_total_amount IS 'Total amount in origin country currency';
COMMENT ON COLUMN quotes.apply_sales_tax IS 'Whether to apply origin country sales tax (user choice)';
COMMENT ON COLUMN quotes.vat_rate IS 'Applied VAT rate for audit trail';
COMMENT ON COLUMN quotes.sales_tax_rate IS 'Applied sales tax rate for audit trail';