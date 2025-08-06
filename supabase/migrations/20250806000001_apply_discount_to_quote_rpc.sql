-- RPC function to apply discount to quote and recalculate totals
-- This integrates discount application with quote recalculation and analytics tracking

CREATE OR REPLACE FUNCTION apply_discount_to_quote(
  p_quote_id UUID,
  p_discount_codes TEXT[],
  p_customer_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  recalculated_quote JSONB,
  applied_discounts JSONB[],
  total_savings NUMERIC,
  new_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote RECORD;
  v_customer_id UUID;
  v_discount_record RECORD;
  v_applied_discounts JSONB[] := ARRAY[]::JSONB[];
  v_total_savings NUMERIC := 0;
  v_calculation_input JSONB;
  v_recalculated_result JSONB;
  v_new_total NUMERIC;
  v_usage_id UUID;
  v_discount_amount NUMERIC;
  v_component_breakdown JSONB := '{}';
BEGIN
  -- Get quote details
  SELECT * INTO v_quote
  FROM quotes_v2
  WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Quote not found', NULL::JSONB, NULL::JSONB[], 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Use provided customer_id or get from quote
  v_customer_id := COALESCE(p_customer_id, v_quote.customer_id);
  
  IF v_customer_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Customer ID required', NULL::JSONB, NULL::JSONB[], 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Validate discount codes and get applicable discounts
  FOR v_discount_record IN 
    SELECT * FROM calculate_applicable_discounts(
      v_customer_id,
      COALESCE((v_quote.calculation_data->>'total_customer_currency')::NUMERIC, v_quote.total_usd),
      COALESCE((v_quote.calculation_data->'calculation_steps'->>'handling_fee')::NUMERIC, 0),
      'card', -- Default payment method
      v_quote.destination_country
    )
    WHERE discount_code = ANY(p_discount_codes)
  LOOP
    -- Track this discount usage
    INSERT INTO customer_discount_usage (
      customer_id,
      discount_code_id,
      quote_id,
      order_id,
      campaign_id,
      discount_amount,
      original_amount,
      currency,
      components_discounted,
      component_breakdown,
      used_at
    ) VALUES (
      v_customer_id,
      (SELECT id FROM discount_codes WHERE code = v_discount_record.discount_code LIMIT 1),
      p_quote_id,
      NULL, -- Will be updated when order is created
      (SELECT campaign_id FROM discount_codes WHERE code = v_discount_record.discount_code LIMIT 1),
      v_discount_record.discount_amount,
      v_discount_record.applicable_amount,
      COALESCE(v_quote.customer_currency, 'USD'),
      CASE v_discount_record.applicable_components
        WHEN 'total' THEN ARRAY['total']
        WHEN 'shipping' THEN ARRAY['shipping'] 
        WHEN 'customs' THEN ARRAY['customs']
        WHEN 'handling' THEN ARRAY['handling']
        ELSE ARRAY['total']
      END,
      jsonb_build_object(
        v_discount_record.applicable_components, 
        v_discount_record.discount_amount
      ),
      NOW()
    )
    RETURNING id INTO v_usage_id;
    
    -- Build applied discounts array
    v_applied_discounts := v_applied_discounts || jsonb_build_object(
      'code', v_discount_record.discount_code,
      'name', v_discount_record.discount_code, -- Can be enhanced with proper names
      'type', v_discount_record.discount_type,
      'amount', v_discount_record.discount_amount,
      'applicable_to', v_discount_record.applicable_components,
      'usage_id', v_usage_id
    );
    
    v_total_savings := v_total_savings + v_discount_record.discount_amount;
    
    -- Build component breakdown for recalculation
    IF v_discount_record.applicable_components = 'total' THEN
      v_component_breakdown := jsonb_set(
        v_component_breakdown, 
        '{order_discount}', 
        jsonb_build_object(
          'type', CASE WHEN v_discount_record.discount_type = 'percentage' THEN 'percentage' ELSE 'fixed' END,
          'value', v_discount_record.value
        )
      );
    ELSE
      -- Component-specific discount
      v_component_breakdown := jsonb_set(
        v_component_breakdown, 
        ARRAY[v_discount_record.applicable_components || '_discount'], 
        jsonb_build_object(
          'type', CASE WHEN v_discount_record.discount_type = 'percentage' THEN 'percentage' ELSE 'fixed' END,
          'value', v_discount_record.value
        )
      );
    END IF;
  END LOOP;
  
  IF array_length(v_applied_discounts, 1) = 0 THEN
    RETURN QUERY SELECT FALSE, 'No valid discount codes found', NULL::JSONB, NULL::JSONB[], 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Prepare calculation input for recalculation
  v_calculation_input := jsonb_build_object(
    'items', v_quote.items,
    'origin_currency', COALESCE(v_quote.calculation_data->'inputs'->>'origin_currency', 'USD'),
    'origin_country', v_quote.origin_country,
    'destination_country', v_quote.destination_country,
    'destination_address', v_quote.delivery_address,
    'customer_id', v_customer_id,
    'discount_codes', p_discount_codes,
    'apply_component_discounts', TRUE
  ) || v_component_breakdown;
  
  -- Calculate new total (simplified - in real implementation, you'd call the calculator)
  v_new_total := GREATEST(
    COALESCE((v_quote.calculation_data->>'total_customer_currency')::NUMERIC, v_quote.total_usd) - v_total_savings,
    0
  );
  
  -- Update quote with applied discounts
  UPDATE quotes_v2 
  SET 
    calculation_data = jsonb_set(
      COALESCE(calculation_data, '{}'),
      '{applied_discounts}',
      to_jsonb(v_applied_discounts)
    ),
    calculation_data = jsonb_set(
      calculation_data,
      '{total_savings}',
      to_jsonb(v_total_savings)
    ),
    calculation_data = jsonb_set(
      calculation_data,
      '{discounted_total}',
      to_jsonb(v_new_total)
    ),
    total_customer_currency = v_new_total,
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Build return result
  SELECT calculation_data INTO v_recalculated_result FROM quotes_v2 WHERE id = p_quote_id;
  
  RETURN QUERY SELECT 
    TRUE, 
    format('%s discount(s) applied successfully', array_length(v_applied_discounts, 1)), 
    v_recalculated_result,
    v_applied_discounts,
    v_total_savings,
    v_new_total;
END;
$$;

-- Function to remove discount from quote
CREATE OR REPLACE FUNCTION remove_discount_from_quote(
  p_quote_id UUID,
  p_discount_codes TEXT[] DEFAULT NULL -- If NULL, removes all discounts
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  recalculated_quote JSONB,
  original_total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote RECORD;
  v_original_total NUMERIC;
  v_usage_record RECORD;
BEGIN
  -- Get quote details
  SELECT * INTO v_quote
  FROM quotes_v2
  WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Quote not found', NULL::JSONB, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Get original total before discounts
  v_original_total := COALESCE(
    (v_quote.calculation_data->>'total_usd')::NUMERIC,
    v_quote.total_usd
  );
  
  -- Remove discount usage records
  IF p_discount_codes IS NOT NULL THEN
    -- Remove specific discount codes
    DELETE FROM customer_discount_usage 
    WHERE quote_id = p_quote_id 
      AND discount_code_id IN (
        SELECT id FROM discount_codes WHERE code = ANY(p_discount_codes)
      );
  ELSE
    -- Remove all discounts from this quote
    DELETE FROM customer_discount_usage 
    WHERE quote_id = p_quote_id;
  END IF;
  
  -- Update quote to remove discount data
  UPDATE quotes_v2 
  SET 
    calculation_data = calculation_data - 'applied_discounts' - 'total_savings' - 'discounted_total',
    total_customer_currency = v_original_total,
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Return updated quote
  SELECT calculation_data INTO v_quote FROM quotes_v2 WHERE id = p_quote_id;
  
  RETURN QUERY SELECT 
    TRUE, 
    'Discount(s) removed successfully', 
    v_quote.calculation_data,
    v_original_total;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION apply_discount_to_quote(UUID, TEXT[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_discount_from_quote(UUID, TEXT[]) TO authenticated;

-- Add comments
COMMENT ON FUNCTION apply_discount_to_quote(UUID, TEXT[], UUID) IS 'Applies discount codes to a quote, recalculates totals, and tracks usage for analytics';
COMMENT ON FUNCTION remove_discount_from_quote(UUID, TEXT[]) IS 'Removes discount codes from a quote and restores original totals';