-- Create function to calculate gateway fees based on configuration
CREATE OR REPLACE FUNCTION calculate_gateway_fee(
  p_gateway_code TEXT,
  p_amount NUMERIC,
  p_currency TEXT,
  p_country_code TEXT DEFAULT NULL
) RETURNS TABLE (
  fee_amount NUMERIC(10,2),
  net_amount NUMERIC(10,2),
  fee_percentage NUMERIC(5,3),
  fee_config_id UUID
) AS $$
DECLARE
  v_config RECORD;
  v_fee NUMERIC(10,2) DEFAULT 0;
  v_fee_percent NUMERIC(5,3) DEFAULT 0;
  v_tier_fee NUMERIC(10,2);
  v_tier JSONB;
BEGIN
  -- Validate inputs
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT 
      0::NUMERIC(10,2),
      p_amount::NUMERIC(10,2),
      0::NUMERIC(5,3),
      NULL::UUID;
    RETURN;
  END IF;
  
  -- Get fee configuration
  -- First try country-specific config, then fall back to generic
  SELECT * INTO v_config
  FROM payment_gateway_fee_config
  WHERE gateway_code = p_gateway_code
    AND (
      (country_code = p_country_code) OR 
      (country_code IS NULL AND p_country_code IS NOT NULL) OR
      (country_code IS NULL)
    )
    AND is_active = TRUE
    AND effective_from <= NOW()
    AND (effective_to IS NULL OR effective_to > NOW())
  ORDER BY 
    CASE WHEN country_code = p_country_code THEN 0 ELSE 1 END,
    effective_from DESC
  LIMIT 1;
  
  -- If no config found, return zero fees
  IF v_config IS NULL THEN
    RETURN QUERY SELECT 
      0::NUMERIC(10,2),
      p_amount::NUMERIC(10,2),
      0::NUMERIC(5,3),
      NULL::UUID;
    RETURN;
  END IF;
  
  -- Calculate fee based on fee type
  CASE v_config.fee_type
    WHEN 'percentage' THEN
      -- Percentage fee + optional fixed fee
      v_fee := ROUND((p_amount * v_config.fee_percentage / 100)::NUMERIC(10,2), 2);
      IF v_config.fixed_fee_amount IS NOT NULL THEN
        v_fee := v_fee + v_config.fixed_fee_amount;
      END IF;
      v_fee_percent := v_config.fee_percentage;
      
    WHEN 'fixed' THEN
      -- Fixed fee only
      v_fee := COALESCE(v_config.fixed_fee_amount, 0);
      IF p_amount > 0 THEN
        v_fee_percent := ROUND((v_fee / p_amount * 100)::NUMERIC(5,3), 3);
      END IF;
      
    WHEN 'tiered' THEN
      -- Tiered fee structure from JSON config
      IF v_config.tier_config IS NOT NULL THEN
        -- Example tier_config structure:
        -- {
        --   "tiers": [
        --     {"min": 0, "max": 100, "percentage": 3.0, "fixed": 0},
        --     {"min": 100, "max": 1000, "percentage": 2.5, "fixed": 0},
        --     {"min": 1000, "max": null, "percentage": 2.0, "fixed": 0}
        --   ]
        -- }
        FOR v_tier IN SELECT * FROM jsonb_array_elements(v_config.tier_config->'tiers')
        LOOP
          IF (v_tier->>'min')::NUMERIC <= p_amount AND 
             (v_tier->>'max' IS NULL OR (v_tier->>'max')::NUMERIC > p_amount) THEN
            v_fee := ROUND((p_amount * (v_tier->>'percentage')::NUMERIC / 100)::NUMERIC(10,2), 2);
            IF v_tier->>'fixed' IS NOT NULL THEN
              v_fee := v_fee + (v_tier->>'fixed')::NUMERIC;
            END IF;
            v_fee_percent := (v_tier->>'percentage')::NUMERIC;
            EXIT;
          END IF;
        END LOOP;
      END IF;
      
    ELSE
      -- Unknown fee type, default to zero
      v_fee := 0;
      v_fee_percent := 0;
  END CASE;
  
  -- Ensure fee doesn't exceed amount
  IF v_fee > p_amount THEN
    v_fee := p_amount;
    v_fee_percent := 100;
  END IF;
  
  -- Return calculated values
  RETURN QUERY SELECT 
    v_fee,
    (p_amount - v_fee)::NUMERIC(10,2),
    v_fee_percent,
    v_config.id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create helper function to get fee for a specific transaction
CREATE OR REPLACE FUNCTION get_transaction_fee(
  p_payment_transaction_id UUID
) RETURNS TABLE (
  fee_amount NUMERIC(10,2),
  net_amount NUMERIC(10,2),
  fee_percentage NUMERIC(5,3)
) AS $$
DECLARE
  v_transaction RECORD;
BEGIN
  -- Get transaction details
  SELECT 
    pt.*,
    q.destination_country
  INTO v_transaction
  FROM payment_transactions pt
  LEFT JOIN quotes q ON pt.quote_id = q.id
  WHERE pt.id = p_payment_transaction_id;
  
  IF v_transaction IS NULL THEN
    RETURN QUERY SELECT 
      0::NUMERIC(10,2),
      0::NUMERIC(10,2),
      0::NUMERIC(5,3);
    RETURN;
  END IF;
  
  -- If fee already recorded, return it
  IF v_transaction.gateway_fee_amount IS NOT NULL THEN
    RETURN QUERY SELECT 
      v_transaction.gateway_fee_amount,
      v_transaction.net_amount,
      v_transaction.fee_percentage;
    RETURN;
  END IF;
  
  -- Otherwise calculate based on configuration
  RETURN QUERY 
  SELECT 
    cf.fee_amount,
    cf.net_amount,
    cf.fee_percentage
  FROM calculate_gateway_fee(
    CASE 
      WHEN v_transaction.payment_method = 'payu' THEN 'payu'
      WHEN v_transaction.payment_method = 'paypal' THEN 'paypal'
      ELSE v_transaction.payment_method
    END,
    v_transaction.amount,
    v_transaction.currency,
    v_transaction.destination_country
  ) cf;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_gateway_fee TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_gateway_fee TO service_role;
GRANT EXECUTE ON FUNCTION get_transaction_fee TO authenticated;
GRANT EXECUTE ON FUNCTION get_transaction_fee TO service_role;

-- Add comments
COMMENT ON FUNCTION calculate_gateway_fee IS 'Calculates gateway fees based on configured fee structures. Supports percentage, fixed, and tiered fee types.';
COMMENT ON FUNCTION get_transaction_fee IS 'Gets or calculates gateway fee for a specific payment transaction.';