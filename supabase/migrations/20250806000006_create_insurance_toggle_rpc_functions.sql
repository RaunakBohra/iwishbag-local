-- RPC functions for insurance toggle with proper quote recalculation
-- This integrates insurance changes with quote recalculation and proper fee calculation

CREATE OR REPLACE FUNCTION update_quote_insurance(
  p_quote_id UUID,
  p_insurance_enabled BOOLEAN,
  p_customer_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  recalculated_quote JSONB,
  insurance_fee NUMERIC,
  new_total NUMERIC,
  insurance_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote RECORD;
  v_customer_id UUID;
  v_route_calculations JSONB;
  v_insurance_config JSONB;
  v_insurance_fee NUMERIC := 0;
  v_original_total NUMERIC;
  v_new_total NUMERIC;
  v_updated_calculation_data JSONB;
  v_insurance_details JSONB;
  v_coverage_amount NUMERIC;
BEGIN
  -- Get quote details
  SELECT * INTO v_quote
  FROM quotes_v2
  WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Quote not found', NULL::JSONB, 0::NUMERIC, 0::NUMERIC, NULL::JSONB;
    RETURN;
  END IF;
  
  -- Use provided customer_id or get from quote
  v_customer_id := COALESCE(p_customer_id, v_quote.customer_id);
  
  -- Get route calculations and insurance configuration
  v_route_calculations := COALESCE(v_quote.calculation_data->'route_calculations', '{}');
  v_insurance_config := COALESCE(v_route_calculations->'insurance', '{}');
  
  -- Get original total (before any insurance changes)
  v_original_total := COALESCE((v_quote.calculation_data->>'total_customer_currency')::NUMERIC, v_quote.total_usd);
  
  -- Calculate insurance fee if enabled
  IF p_insurance_enabled THEN
    -- Get coverage amount (total value of items)
    v_coverage_amount := COALESCE(v_quote.total_usd, 0);
    
    -- Calculate insurance fee using route configuration or fallback values
    v_insurance_fee := GREATEST(
      v_coverage_amount * COALESCE((v_insurance_config->>'percentage')::NUMERIC, 1.5) / 100,
      COALESCE((v_insurance_config->>'min_fee')::NUMERIC, 2)
    );
    
    -- Cap at max fee if specified
    IF v_insurance_config->>'max_fee' IS NOT NULL THEN
      v_insurance_fee := LEAST(v_insurance_fee, (v_insurance_config->>'max_fee')::NUMERIC);
    END IF;
    
    -- Build insurance details
    v_insurance_details := jsonb_build_object(
      'enabled', TRUE,
      'coverage_amount', v_coverage_amount,
      'fee_amount', v_insurance_fee,
      'percentage_rate', COALESCE((v_insurance_config->>'percentage')::NUMERIC, 1.5),
      'min_fee', COALESCE((v_insurance_config->>'min_fee')::NUMERIC, 2),
      'max_fee', v_insurance_config->>'max_fee',
      'currency', COALESCE(v_quote.customer_currency, 'USD')
    );
  ELSE
    -- Insurance disabled
    v_insurance_fee := 0;
    v_insurance_details := jsonb_build_object(
      'enabled', FALSE,
      'coverage_amount', 0,
      'fee_amount', 0,
      'currency', COALESCE(v_quote.customer_currency, 'USD')
    );
  END IF;
  
  -- Calculate new total
  -- Remove any existing insurance fee from current total and add new one
  v_new_total := v_original_total;
  
  -- If there was an existing insurance fee, subtract it
  IF (v_quote.calculation_data->'calculation_steps'->>'insurance_amount')::NUMERIC IS NOT NULL THEN
    v_new_total := v_new_total - (v_quote.calculation_data->'calculation_steps'->>'insurance_amount')::NUMERIC;
  END IF;
  
  -- Add new insurance fee
  v_new_total := v_new_total + v_insurance_fee;
  
  -- Update calculation data with new insurance information
  v_updated_calculation_data := COALESCE(v_quote.calculation_data, '{}');
  
  -- Update insurance in calculation steps
  v_updated_calculation_data := jsonb_set(
    v_updated_calculation_data, 
    '{calculation_steps,insurance_amount}', 
    to_jsonb(v_insurance_fee)
  );
  
  -- Update route calculations insurance config
  v_updated_calculation_data := jsonb_set(
    v_updated_calculation_data, 
    '{route_calculations,insurance}', 
    v_insurance_config || jsonb_build_object('current_fee', v_insurance_fee, 'enabled', p_insurance_enabled)
  );
  
  -- Update total with insurance changes
  v_updated_calculation_data := jsonb_set(
    v_updated_calculation_data, 
    '{total_customer_currency}', 
    to_jsonb(v_new_total)
  );
  
  -- Add insurance update metadata
  v_updated_calculation_data := jsonb_set(
    v_updated_calculation_data, 
    '{insurance_last_updated}', 
    to_jsonb(EXTRACT(EPOCH FROM NOW()))
  );
  
  -- Update quote in database
  UPDATE quotes_v2 
  SET 
    insurance_required = p_insurance_enabled,
    calculation_data = v_updated_calculation_data,
    total_customer_currency = v_new_total,
    updated_at = NOW()
  WHERE id = p_quote_id;
  
  -- Log insurance change for analytics
  INSERT INTO quote_audit_log (
    quote_id,
    customer_id,
    action_type,
    action_data,
    performed_at
  ) VALUES (
    p_quote_id,
    v_customer_id,
    'insurance_update',
    jsonb_build_object(
      'insurance_enabled', p_insurance_enabled,
      'insurance_fee', v_insurance_fee,
      'previous_total', v_original_total,
      'new_total', v_new_total
    ),
    NOW()
  ) ON CONFLICT DO NOTHING; -- Ignore if audit table doesn't exist
  
  RETURN QUERY SELECT 
    TRUE, 
    CASE 
      WHEN p_insurance_enabled THEN format('Insurance enabled - Fee: %s', v_insurance_fee)
      ELSE 'Insurance disabled'
    END, 
    v_updated_calculation_data,
    v_insurance_fee,
    v_new_total,
    v_insurance_details;
END;
$$;

-- Function to get insurance quote/estimates
CREATE OR REPLACE FUNCTION get_insurance_estimate(
  p_quote_id UUID,
  p_coverage_amount NUMERIC DEFAULT NULL
)
RETURNS TABLE(
  available BOOLEAN,
  fee_estimate NUMERIC,
  coverage_amount NUMERIC,
  percentage_rate NUMERIC,
  min_fee NUMERIC,
  max_fee NUMERIC,
  currency TEXT,
  benefits JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote RECORD;
  v_insurance_config JSONB;
  v_coverage NUMERIC;
  v_fee NUMERIC;
BEGIN
  -- Get quote details
  SELECT * INTO v_quote
  FROM quotes_v2
  WHERE id = p_quote_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, NULL::NUMERIC, 'USD', NULL::JSONB;
    RETURN;
  END IF;
  
  -- Get insurance configuration from route calculations
  v_insurance_config := COALESCE(v_quote.calculation_data->'route_calculations'->'insurance', '{}');
  
  -- Use provided coverage or quote total
  v_coverage := COALESCE(p_coverage_amount, v_quote.total_usd, 0);
  
  -- Calculate fee estimate
  v_fee := GREATEST(
    v_coverage * COALESCE((v_insurance_config->>'percentage')::NUMERIC, 1.5) / 100,
    COALESCE((v_insurance_config->>'min_fee')::NUMERIC, 2)
  );
  
  -- Apply max fee cap if specified
  IF v_insurance_config->>'max_fee' IS NOT NULL THEN
    v_fee := LEAST(v_fee, (v_insurance_config->>'max_fee')::NUMERIC);
  END IF;
  
  -- Return insurance estimate details
  RETURN QUERY SELECT 
    COALESCE((v_insurance_config->>'available')::BOOLEAN, TRUE),
    v_fee,
    v_coverage,
    COALESCE((v_insurance_config->>'percentage')::NUMERIC, 1.5),
    COALESCE((v_insurance_config->>'min_fee')::NUMERIC, 2),
    (v_insurance_config->>'max_fee')::NUMERIC,
    COALESCE(v_quote.customer_currency, 'USD'),
    jsonb_build_object(
      'lost_or_stolen', TRUE,
      'damage_in_transit', TRUE,
      'customs_confiscation', TRUE,
      'carrier_errors', TRUE,
      'full_refund_or_replacement', TRUE
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_quote_insurance(UUID, BOOLEAN, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_insurance_estimate(UUID, NUMERIC) TO authenticated;

-- Add comments
COMMENT ON FUNCTION update_quote_insurance(UUID, BOOLEAN, UUID) IS 'Updates quote insurance status, recalculates fees and totals';
COMMENT ON FUNCTION get_insurance_estimate(UUID, NUMERIC) IS 'Provides insurance fee estimates and coverage details';