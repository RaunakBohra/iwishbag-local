-- Enhance quotes_v2 table for complete quote options persistence
-- This migration adds comprehensive support for tracking quote option changes

-- Add new columns for quote options tracking
ALTER TABLE quotes_v2 
ADD COLUMN IF NOT EXISTS selected_shipping_option_id TEXT,
ADD COLUMN IF NOT EXISTS applied_discount_codes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS discount_amounts JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS options_last_updated_by TEXT,
ADD COLUMN IF NOT EXISTS options_last_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS insurance_coverage_amount DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_rate_percentage DECIMAL(5,2) DEFAULT 1.5;

-- Add comments for clarity
COMMENT ON COLUMN quotes_v2.selected_shipping_option_id IS 'ID of selected shipping option from delivery_options';
COMMENT ON COLUMN quotes_v2.applied_discount_codes IS 'Array of applied discount codes ["FIRST10", "SAVE15"]';
COMMENT ON COLUMN quotes_v2.discount_amounts IS 'Discount amounts by code {"FIRST10": 25.50, "SAVE15": 45.00}';
COMMENT ON COLUMN quotes_v2.options_last_updated_by IS 'User ID who last updated quote options';
COMMENT ON COLUMN quotes_v2.options_last_updated_at IS 'Timestamp of last option update';
COMMENT ON COLUMN quotes_v2.insurance_coverage_amount IS 'Total coverage amount for insurance';
COMMENT ON COLUMN quotes_v2.insurance_rate_percentage IS 'Insurance rate percentage (1.5 = 1.5%)';

-- Create index for efficient option-based queries
CREATE INDEX IF NOT EXISTS idx_quotes_v2_shipping_option 
ON quotes_v2(selected_shipping_option_id) 
WHERE selected_shipping_option_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_v2_discount_codes 
ON quotes_v2 USING GIN(applied_discount_codes) 
WHERE applied_discount_codes != '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_quotes_v2_options_updated 
ON quotes_v2(options_last_updated_at DESC, options_last_updated_by)
WHERE options_last_updated_at IS NOT NULL;

-- Create function to get complete quote options state
CREATE OR REPLACE FUNCTION get_quote_options_state(quote_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  quote_record quotes_v2%ROWTYPE;
  shipping_options JSONB;
  options_state JSONB;
BEGIN
  -- Get quote details
  SELECT * INTO quote_record
  FROM quotes_v2
  WHERE id = quote_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', quote_id_param;
  END IF;
  
  -- Get available shipping options for this route
  SELECT delivery_options INTO shipping_options
  FROM shipping_routes
  WHERE origin_country = quote_record.origin_country
    AND destination_country = quote_record.destination_country
    AND is_active = true;
  
  IF shipping_options IS NULL THEN
    shipping_options := '[]'::jsonb;
  END IF;
  
  -- Build complete options state
  options_state := jsonb_build_object(
    'shipping', jsonb_build_object(
      'selected_option_id', quote_record.selected_shipping_option_id,
      'selected_method', quote_record.shipping_method,
      'available_options', shipping_options,
      'cost', COALESCE((quote_record.calculation_data->'breakdown'->>'shipping')::decimal, 0),
      'cost_currency', COALESCE(quote_record.customer_currency, 'USD')
    ),
    'insurance', jsonb_build_object(
      'enabled', COALESCE(quote_record.insurance_required, false),
      'available', true, -- TODO: Check route calculations
      'cost', COALESCE((quote_record.calculation_data->'breakdown'->>'insurance')::decimal, 0),
      'cost_currency', COALESCE(quote_record.customer_currency, 'USD'),
      'coverage_amount', COALESCE(quote_record.insurance_coverage_amount, quote_record.total_usd, 0),
      'rate_percentage', COALESCE(quote_record.insurance_rate_percentage, 1.5)
    ),
    'discounts', jsonb_build_object(
      'applied_codes', COALESCE(quote_record.applied_discount_codes, '[]'::jsonb),
      'discount_amounts', COALESCE(quote_record.discount_amounts, '{}'::jsonb),
      'total_discount', COALESCE((quote_record.calculation_data->'breakdown'->>'discount')::decimal, 0),
      'discount_currency', COALESCE(quote_record.customer_currency, 'USD')
    ),
    'totals', jsonb_build_object(
      'base_total', COALESCE(quote_record.costprice_total_usd, 0),
      'adjusted_total', COALESCE(quote_record.total_customer_currency, quote_record.total_usd, 0),
      'currency', COALESCE(quote_record.customer_currency, 'USD'),
      'savings', COALESCE((quote_record.calculation_data->>'total_savings')::decimal, 0)
    ),
    'metadata', jsonb_build_object(
      'last_updated_by', quote_record.options_last_updated_by,
      'last_updated_at', quote_record.options_last_updated_at,
      'quote_id', quote_record.id,
      'quote_status', quote_record.status
    )
  );
  
  RETURN options_state;
END;
$$;

-- Create function to update quote options atomically
CREATE OR REPLACE FUNCTION update_quote_options(
  quote_id_param UUID,
  shipping_option_id_param TEXT DEFAULT NULL,
  shipping_method_param TEXT DEFAULT NULL,
  insurance_enabled_param BOOLEAN DEFAULT NULL,
  discount_codes_param JSONB DEFAULT NULL,
  discount_amounts_param JSONB DEFAULT NULL,
  updated_by_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_quote quotes_v2%ROWTYPE;
  options_state JSONB;
BEGIN
  -- Update quote with new option values
  UPDATE quotes_v2
  SET 
    selected_shipping_option_id = COALESCE(shipping_option_id_param, selected_shipping_option_id),
    shipping_method = COALESCE(shipping_method_param, shipping_method),
    insurance_required = COALESCE(insurance_enabled_param, insurance_required),
    applied_discount_codes = COALESCE(discount_codes_param, applied_discount_codes),
    discount_amounts = COALESCE(discount_amounts_param, discount_amounts),
    options_last_updated_by = COALESCE(updated_by_param, options_last_updated_by),
    options_last_updated_at = NOW(),
    updated_at = NOW()
  WHERE id = quote_id_param
  RETURNING * INTO updated_quote;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', quote_id_param;
  END IF;
  
  -- Get updated options state
  SELECT get_quote_options_state(quote_id_param) INTO options_state;
  
  -- Return success with updated state
  RETURN jsonb_build_object(
    'success', true,
    'quote_id', quote_id_param,
    'options_state', options_state,
    'updated_at', updated_quote.options_last_updated_at
  );
END;
$$;

-- Create trigger to automatically update options_last_updated_at
CREATE OR REPLACE FUNCTION trigger_update_quote_options_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only update timestamp if option-related fields changed
  IF (OLD.selected_shipping_option_id IS DISTINCT FROM NEW.selected_shipping_option_id) OR
     (OLD.shipping_method IS DISTINCT FROM NEW.shipping_method) OR
     (OLD.insurance_required IS DISTINCT FROM NEW.insurance_required) OR
     (OLD.applied_discount_codes IS DISTINCT FROM NEW.applied_discount_codes) OR
     (OLD.discount_amounts IS DISTINCT FROM NEW.discount_amounts) THEN
    
    NEW.options_last_updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_quote_options_timestamp ON quotes_v2;
CREATE TRIGGER trigger_quote_options_timestamp
  BEFORE UPDATE ON quotes_v2
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_quote_options_timestamp();

-- Create view for quote options analytics
CREATE OR REPLACE VIEW quote_options_analytics AS
SELECT 
  q.id as quote_id,
  q.status as quote_status,
  q.origin_country,
  q.destination_country,
  q.selected_shipping_option_id,
  q.shipping_method,
  q.insurance_required,
  q.applied_discount_codes,
  q.discount_amounts,
  q.total_usd,
  q.total_customer_currency,
  q.customer_currency,
  q.options_last_updated_by,
  q.options_last_updated_at,
  q.created_at,
  q.updated_at,
  -- Calculated fields
  jsonb_array_length(COALESCE(q.applied_discount_codes, '[]'::jsonb)) as discount_codes_count,
  CASE 
    WHEN q.applied_discount_codes != '[]'::jsonb AND q.applied_discount_codes IS NOT NULL 
    THEN true 
    ELSE false 
  END as has_discounts,
  CASE 
    WHEN q.insurance_required = true 
    THEN (q.calculation_data->'breakdown'->>'insurance')::decimal 
    ELSE 0 
  END as insurance_cost
FROM quotes_v2 q
WHERE q.status IN ('pending', 'approved', 'paid', 'completed');

-- Grant appropriate permissions
GRANT SELECT ON quote_options_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_quote_options_state(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_quote_options(UUID, TEXT, TEXT, BOOLEAN, JSONB, JSONB, TEXT) TO authenticated;

-- Test the functions
SELECT 'Testing quote options functions...' as test_status;

-- Test getting options state for a quote (will return error if no quotes exist, which is expected)
DO $$
BEGIN
  PERFORM get_quote_options_state('00000000-0000-4000-8000-000000000001'::uuid);
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Expected error for non-existent quote: %', SQLERRM;
END
$$;

SELECT 'Quote options schema enhancement completed successfully!' as result;