-- Fix the UPDATE statement in apply_discount_to_quote RPC function

DROP FUNCTION IF EXISTS apply_discount_to_quote(UUID, TEXT[], UUID);

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
  v_applicable_component TEXT := 'total'; -- Default to total
  v_updated_calculation_data JSONB;
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
    -- Determine applicable component based on discount type or default to 'total'
    v_applicable_component := CASE 
      WHEN v_discount_record.discount_type = 'shipping' THEN 'shipping'
      WHEN v_discount_record.discount_type = 'customs' THEN 'customs' 
      WHEN v_discount_record.discount_type = 'handling' THEN 'handling'
      ELSE 'total'
    END;
    
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
      used_at,
      created_at
    ) VALUES (
      v_customer_id,
      (SELECT id FROM discount_codes WHERE code = v_discount_record.discount_code LIMIT 1),
      p_quote_id,
      NULL, -- Will be updated when order is created
      NULL, -- Campaign ID - could be added later if needed
      v_discount_record.discount_amount,
      v_discount_record.applicable_amount,
      COALESCE(v_quote.customer_currency, 'USD'),
      ARRAY[v_applicable_component],
      jsonb_build_object(v_applicable_component, v_discount_record.discount_amount),
      NOW(),
      NOW()
    )
    ON CONFLICT (customer_id, quote_id, discount_code_id) DO UPDATE SET
      discount_amount = EXCLUDED.discount_amount,
      original_amount = EXCLUDED.original_amount,
      used_at = NOW()
    RETURNING id INTO v_usage_id;
    
    -- Build applied discounts array
    v_applied_discounts := v_applied_discounts || jsonb_build_object(
      'code', v_discount_record.discount_code,
      'name', v_discount_record.discount_code, -- Can be enhanced with proper names
      'type', v_discount_record.discount_type,
      'amount', v_discount_record.discount_amount,
      'applicable_to', v_applicable_component,
      'usage_id', v_usage_id
    );
    
    v_total_savings := v_total_savings + v_discount_record.discount_amount;
  END LOOP;
  
  IF array_length(v_applied_discounts, 1) = 0 THEN
    RETURN QUERY SELECT FALSE, 'No valid discount codes found', NULL::JSONB, NULL::JSONB[], 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Calculate new total (simplified - in real implementation, you'd call the calculator)
  v_new_total := GREATEST(
    COALESCE((v_quote.calculation_data->>'total_customer_currency')::NUMERIC, v_quote.total_usd) - v_total_savings,
    0
  );
  
  -- Build updated calculation data with all discount information
  v_updated_calculation_data := COALESCE(v_quote.calculation_data, '{}');
  v_updated_calculation_data := jsonb_set(v_updated_calculation_data, '{applied_discounts}', to_jsonb(v_applied_discounts));
  v_updated_calculation_data := jsonb_set(v_updated_calculation_data, '{total_savings}', to_jsonb(v_total_savings));
  v_updated_calculation_data := jsonb_set(v_updated_calculation_data, '{discounted_total}', to_jsonb(v_new_total));
  
  -- Update quote with applied discounts (single assignment to calculation_data)
  UPDATE quotes_v2 
  SET 
    calculation_data = v_updated_calculation_data,
    total_customer_currency = v_new_total,
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Build return result
  v_recalculated_result := v_updated_calculation_data;
  
  RETURN QUERY SELECT 
    TRUE, 
    format('%s discount(s) applied successfully', array_length(v_applied_discounts, 1)), 
    v_recalculated_result,
    v_applied_discounts,
    v_total_savings,
    v_new_total;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION apply_discount_to_quote(UUID, TEXT[], UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION apply_discount_to_quote(UUID, TEXT[], UUID) IS 'Applies discount codes to a quote, recalculates totals, and tracks usage for analytics - WORKING VERSION';