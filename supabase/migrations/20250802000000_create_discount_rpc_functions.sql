-- Create RPC functions for discount system analytics and management

-- Function to get comprehensive discount statistics
CREATE OR REPLACE FUNCTION get_discount_stats()
RETURNS TABLE(
  total_discounts_used bigint,
  total_savings numeric,
  active_campaigns bigint,
  conversion_rate numeric,
  total_customers_with_discounts bigint,
  average_discount_amount numeric,
  most_used_discount_code text,
  most_used_discount_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total number of discounts used across all quotes and orders
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM customer_discount_usage
    ), 0) as total_discounts_used,
    
    -- Total savings for customers
    COALESCE((
      SELECT SUM(discount_amount)::numeric
      FROM customer_discount_usage
    ), 0) as total_savings,
    
    -- Number of active campaigns
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM discount_campaigns
      WHERE is_active = true
        AND (expiry_date IS NULL OR expiry_date > NOW())
    ), 0) as active_campaigns,
    
    -- Conversion rate (quotes with discounts that became orders)
    COALESCE((
      SELECT 
        CASE 
          WHEN COUNT(DISTINCT quote_id) > 0 THEN
            (COUNT(DISTINCT order_id)::numeric / COUNT(DISTINCT quote_id)::numeric * 100)
          ELSE 0
        END
      FROM customer_discount_usage
      WHERE quote_id IS NOT NULL
    ), 0) as conversion_rate,
    
    -- Total unique customers who have used discounts
    COALESCE((
      SELECT COUNT(DISTINCT customer_id)::bigint
      FROM customer_discount_usage
    ), 0) as total_customers_with_discounts,
    
    -- Average discount amount per usage
    COALESCE((
      SELECT AVG(discount_amount)::numeric
      FROM customer_discount_usage
    ), 0) as average_discount_amount,
    
    -- Most used discount code
    COALESCE((
      SELECT dc.code
      FROM discount_codes dc
      JOIN customer_discount_usage cdu ON cdu.discount_code_id = dc.id
      GROUP BY dc.id, dc.code
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ), 'N/A') as most_used_discount_code,
    
    -- Count of most used discount
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM customer_discount_usage cdu
      WHERE cdu.discount_code_id = (
        SELECT discount_code_id
        FROM customer_discount_usage
        WHERE discount_code_id IS NOT NULL
        GROUP BY discount_code_id
        ORDER BY COUNT(*) DESC
        LIMIT 1
      )
    ), 0) as most_used_discount_count;
END;
$$;

-- Function to get discount usage analytics by date range
CREATE OR REPLACE FUNCTION get_discount_usage_analytics(
  start_date timestamp with time zone DEFAULT NOW() - INTERVAL '30 days',
  end_date timestamp with time zone DEFAULT NOW()
)
RETURNS TABLE(
  usage_date date,
  total_uses bigint,
  total_discount_amount numeric,
  unique_customers bigint,
  top_discount_code text,
  components_breakdown jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(cdu.used_at) as usage_date,
    COUNT(*)::bigint as total_uses,
    SUM(cdu.discount_amount)::numeric as total_discount_amount,
    COUNT(DISTINCT cdu.customer_id)::bigint as unique_customers,
    (
      SELECT dc.code
      FROM discount_codes dc
      JOIN customer_discount_usage cdu2 ON cdu2.discount_code_id = dc.id
      WHERE DATE(cdu2.used_at) = DATE(cdu.used_at)
      GROUP BY dc.code
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) as top_discount_code,
    jsonb_object_agg(
      component,
      SUM((cdu.component_breakdown->component)::numeric)
    ) FILTER (WHERE cdu.component_breakdown IS NOT NULL) as components_breakdown
  FROM customer_discount_usage cdu
  CROSS JOIN LATERAL jsonb_object_keys(cdu.component_breakdown) as component
  WHERE cdu.used_at >= start_date 
    AND cdu.used_at <= end_date
  GROUP BY DATE(cdu.used_at)
  ORDER BY DATE(cdu.used_at) DESC;
END;
$$;

-- Function to validate discount stacking rules
CREATE OR REPLACE FUNCTION validate_discount_stacking(
  discount_codes text[],
  customer_id uuid DEFAULT NULL
)
RETURNS TABLE(
  is_valid boolean,
  error_message text,
  total_discount_percentage numeric,
  stacked_count integer,
  allowed_combination boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stacking_rules record;
  v_discount_types text[];
  v_total_percentage numeric := 0;
  v_stack_count integer := 0;
  v_is_valid boolean := true;
  v_error_message text := NULL;
  v_allowed boolean := true;
BEGIN
  -- Get active stacking rules
  SELECT * INTO v_stacking_rules
  FROM discount_stacking_rules
  WHERE is_active = true
  LIMIT 1;
  
  -- If no stacking rules, allow all combinations
  IF v_stacking_rules IS NULL THEN
    RETURN QUERY SELECT true, NULL::text, 0::numeric, array_length(discount_codes, 1), true;
    RETURN;
  END IF;
  
  -- Get discount types and calculate total percentage
  SELECT 
    array_agg(DISTINCT dt.type),
    SUM(dt.value)
  INTO v_discount_types, v_total_percentage
  FROM discount_codes dc
  JOIN discount_types dt ON dc.discount_type_id = dt.id
  WHERE dc.code = ANY(discount_codes)
    AND dc.is_active = true;
  
  v_stack_count := array_length(discount_codes, 1);
  
  -- Check stack count limit
  IF v_stack_count > v_stacking_rules.max_stack_count THEN
    v_is_valid := false;
    v_error_message := format('Cannot stack more than %s discounts', v_stacking_rules.max_stack_count);
  END IF;
  
  -- Check total discount percentage limit
  IF v_total_percentage > v_stacking_rules.max_total_discount_percentage THEN
    v_is_valid := false;
    v_error_message := format('Total discount cannot exceed %s%%', v_stacking_rules.max_total_discount_percentage);
  END IF;
  
  -- Check allowed combinations
  IF v_stacking_rules.allowed_combinations IS NOT NULL THEN
    v_allowed := v_discount_types <@ v_stacking_rules.allowed_combinations;
    IF NOT v_allowed THEN
      v_is_valid := false;
      v_error_message := 'This combination of discount types is not allowed';
    END IF;
  END IF;
  
  RETURN QUERY SELECT v_is_valid, v_error_message, v_total_percentage, v_stack_count, v_allowed;
END;
$$;

-- Function to get customer discount history
CREATE OR REPLACE FUNCTION get_customer_discount_history(
  p_customer_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  discount_id uuid,
  discount_code text,
  campaign_name text,
  discount_amount numeric,
  original_amount numeric,
  currency text,
  components_discounted text[],
  used_at timestamp with time zone,
  quote_id uuid,
  order_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cdu.id as discount_id,
    dc.code as discount_code,
    dcamp.name as campaign_name,
    cdu.discount_amount,
    cdu.original_amount,
    cdu.currency,
    cdu.components_discounted,
    cdu.used_at,
    cdu.quote_id,
    cdu.order_id
  FROM customer_discount_usage cdu
  LEFT JOIN discount_codes dc ON cdu.discount_code_id = dc.id
  LEFT JOIN discount_campaigns dcamp ON cdu.campaign_id = dcamp.id
  WHERE cdu.customer_id = p_customer_id
  ORDER BY cdu.used_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to check if customer is eligible for first-time discount
CREATE OR REPLACE FUNCTION is_eligible_for_first_time_discount(
  p_customer_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_count integer;
  v_has_used_first_time boolean;
BEGIN
  -- Check if customer has any completed orders
  SELECT COUNT(*)
  INTO v_order_count
  FROM orders
  WHERE customer_id = p_customer_id
    AND status = 'completed';
  
  IF v_order_count > 0 THEN
    RETURN false;
  END IF;
  
  -- Check if customer has already used a first-time discount
  SELECT EXISTS(
    SELECT 1
    FROM customer_discount_usage cdu
    JOIN discount_types dt ON cdu.discount_code_id IN (
      SELECT id FROM discount_codes WHERE discount_type_id = dt.id
    )
    WHERE cdu.customer_id = p_customer_id
      AND dt.type = 'first_time'
  ) INTO v_has_used_first_time;
  
  RETURN NOT v_has_used_first_time;
END;
$$;

-- Function to apply bulk discount updates
CREATE OR REPLACE FUNCTION bulk_update_discount_status(
  discount_ids uuid[],
  new_status boolean
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count integer;
BEGIN
  UPDATE discount_codes
  SET 
    is_active = new_status,
    updated_at = NOW()
  WHERE id = ANY(discount_ids);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Also update related campaigns if all codes are deactivated
  IF new_status = false THEN
    UPDATE discount_campaigns
    SET 
      is_active = false,
      updated_at = NOW()
    WHERE id IN (
      SELECT DISTINCT campaign_id 
      FROM discount_codes 
      WHERE id = ANY(discount_ids) AND campaign_id IS NOT NULL
    )
    AND NOT EXISTS (
      SELECT 1 
      FROM discount_codes dc 
      WHERE dc.campaign_id = discount_campaigns.id 
        AND dc.is_active = true
        AND dc.id != ANY(discount_ids)
    );
  END IF;
  
  RETURN v_updated_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_discount_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_discount_usage_analytics(timestamp with time zone, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_discount_stacking(text[], uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_discount_history(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION is_eligible_for_first_time_discount(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION bulk_update_discount_status(uuid[], boolean) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_discount_stats() IS 'Returns comprehensive discount system statistics including usage counts, savings, and conversion rates';
COMMENT ON FUNCTION get_discount_usage_analytics(timestamp with time zone, timestamp with time zone) IS 'Returns daily discount usage analytics for a given date range';
COMMENT ON FUNCTION validate_discount_stacking(text[], uuid) IS 'Validates if a combination of discount codes can be stacked according to system rules';
COMMENT ON FUNCTION get_customer_discount_history(uuid, integer) IS 'Returns discount usage history for a specific customer';
COMMENT ON FUNCTION is_eligible_for_first_time_discount(uuid) IS 'Checks if a customer is eligible for first-time customer discount';
COMMENT ON FUNCTION bulk_update_discount_status(uuid[], boolean) IS 'Updates the active status of multiple discount codes at once';