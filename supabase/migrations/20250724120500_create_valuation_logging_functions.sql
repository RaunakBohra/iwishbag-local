-- VALUATION METHOD LOGGING RPC FUNCTIONS
-- Supporting audit trail for PerItemValuationSelector component
-- 
-- These functions provide comprehensive logging for valuation method changes
-- and admin overrides at the per-item level within quotes.

-- Function: Log valuation method changes for individual items
CREATE OR REPLACE FUNCTION log_valuation_method_change(
  p_quote_id TEXT,
  p_item_id TEXT,
  p_admin_id TEXT,
  p_valuation_method TEXT,
  p_change_reason TEXT DEFAULT 'Admin valuation method change',
  p_change_details JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  quote_exists BOOLEAN;
  admin_has_permission BOOLEAN;
BEGIN
  -- Validate quote exists
  SELECT EXISTS(
    SELECT 1 FROM quotes WHERE id = p_quote_id::UUID
  ) INTO quote_exists;
  
  IF NOT quote_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quote not found',
      'quote_id', p_quote_id
    );
  END IF;
  
  -- Validate admin permissions
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id::TEXT = p_admin_id AND role IN ('admin', 'moderator')
  ) INTO admin_has_permission;
  
  IF NOT admin_has_permission THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions - admin or moderator role required',
      'admin_id', p_admin_id
    );
  END IF;
  
  -- Log the valuation method change
  INSERT INTO admin_activity_log (
    admin_id,
    action_type,
    target_type,
    target_id,
    action_details,
    created_at
  ) VALUES (
    p_admin_id::UUID,
    'valuation_method_change',
    'quote_item',
    p_quote_id::UUID, -- Store quote ID as target since we don't have separate item table
    jsonb_build_object(
      'item_id', p_item_id,
      'valuation_method', p_valuation_method,
      'change_reason', p_change_reason,
      'change_details', p_change_details,
      'timestamp', NOW(),
      'component_source', 'PerItemValuationSelector'
    ),
    NOW()
  );
  
  -- Update quote's operational data to track per-item valuation preferences
  UPDATE quotes 
  SET 
    operational_data = COALESCE(operational_data, '{}'::JSONB) || 
      jsonb_build_object(
        'item_valuation_preferences', 
        COALESCE(operational_data->'item_valuation_preferences', '{}'::JSONB) || 
        jsonb_build_object(p_item_id, p_valuation_method)
      ),
    updated_at = NOW()
  WHERE id = p_quote_id::UUID;
  
  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'logged_at', NOW(),
    'quote_id', p_quote_id,
    'item_id', p_item_id,
    'valuation_method', p_valuation_method,
    'admin_id', p_admin_id
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'quote_id', p_quote_id,
      'item_id', p_item_id
    );
END;
$$;

-- Function: Log admin valuation overrides for individual items
CREATE OR REPLACE FUNCTION log_valuation_override(
  p_quote_id TEXT,
  p_item_id TEXT,
  p_admin_id TEXT,
  p_override_amount NUMERIC,
  p_change_reason TEXT DEFAULT 'Admin valuation override',
  p_change_details JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  quote_exists BOOLEAN;
  admin_has_permission BOOLEAN;
  previous_amount NUMERIC;
BEGIN
  -- Validate quote exists and get previous amount if any
  SELECT EXISTS(
    SELECT 1 FROM quotes WHERE id = p_quote_id::UUID
  ) INTO quote_exists;
  
  IF NOT quote_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quote not found',
      'quote_id', p_quote_id
    );
  END IF;
  
  -- Validate admin permissions
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id::TEXT = p_admin_id AND role = 'admin'
  ) INTO admin_has_permission;
  
  IF NOT admin_has_permission THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions - admin role required for overrides',
      'admin_id', p_admin_id
    );
  END IF;
  
  -- Validate override amount
  IF p_override_amount <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Override amount must be greater than 0',
      'override_amount', p_override_amount
    );
  END IF;
  
  -- Get previous override amount if exists
  SELECT COALESCE(
    (operational_data->'item_valuation_overrides'->p_item_id->>'amount')::NUMERIC,
    0
  ) INTO previous_amount
  FROM quotes 
  WHERE id = p_quote_id::UUID;
  
  -- Log the override
  INSERT INTO admin_activity_log (
    admin_id,
    action_type,
    target_type,
    target_id,
    action_details,
    created_at
  ) VALUES (
    p_admin_id::UUID,
    'valuation_override',
    'quote_item',
    p_quote_id::UUID,
    jsonb_build_object(
      'item_id', p_item_id,
      'override_amount', p_override_amount,
      'previous_amount', previous_amount,
      'change_reason', p_change_reason,
      'change_details', p_change_details,
      'timestamp', NOW(),
      'component_source', 'PerItemValuationSelector',
      'requires_recalculation', true
    ),
    NOW()
  );
  
  -- Update quote's operational data to store per-item overrides
  UPDATE quotes 
  SET 
    operational_data = COALESCE(operational_data, '{}'::JSONB) || 
      jsonb_build_object(
        'item_valuation_overrides', 
        COALESCE(operational_data->'item_valuation_overrides', '{}'::JSONB) || 
        jsonb_build_object(
          p_item_id, 
          jsonb_build_object(
            'amount', p_override_amount,
            'admin_id', p_admin_id,
            'timestamp', NOW(),
            'reason', p_change_reason
          )
        )
      ),
    updated_at = NOW()
  WHERE id = p_quote_id::UUID;
  
  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'logged_at', NOW(),
    'quote_id', p_quote_id,
    'item_id', p_item_id,
    'override_amount', p_override_amount,
    'previous_amount', previous_amount,
    'admin_id', p_admin_id,
    'requires_recalculation', true
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'quote_id', p_quote_id,
      'item_id', p_item_id,
      'override_amount', p_override_amount
    );
END;
$$;

-- Function: Get valuation preferences for all items in a quote
CREATE OR REPLACE FUNCTION get_quote_valuation_preferences(quote_id_param UUID)
RETURNS TABLE(
  item_id TEXT,
  valuation_method TEXT,
  override_amount NUMERIC,
  admin_id UUID,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH valuation_data AS (
    SELECT 
      q.operational_data->'item_valuation_preferences' as preferences,
      q.operational_data->'item_valuation_overrides' as overrides
    FROM quotes q
    WHERE q.id = quote_id_param
  ),
  item_preferences AS (
    SELECT 
      key as item_id,
      value#>>'{}'  as valuation_method
    FROM valuation_data, jsonb_each(COALESCE(preferences, '{}'::JSONB))
  ),
  item_overrides AS (
    SELECT 
      key as item_id,
      (value->>'amount')::NUMERIC as override_amount,
      (value->>'admin_id')::UUID as admin_id,
      (value->>'timestamp')::TIMESTAMPTZ as last_updated
    FROM valuation_data, jsonb_each(COALESCE(overrides, '{}'::JSONB))
  )
  SELECT 
    COALESCE(p.item_id, o.item_id) as item_id,
    COALESCE(p.valuation_method, 'higher_of_both') as valuation_method,
    o.override_amount,
    o.admin_id,
    o.last_updated
  FROM item_preferences p
  FULL OUTER JOIN item_overrides o ON p.item_id = o.item_id;
END;
$$;

-- Function: Get valuation change history for a quote
CREATE OR REPLACE FUNCTION get_valuation_change_history(
  quote_id_param UUID,
  limit_records INTEGER DEFAULT 50
)
RETURNS TABLE(
  change_timestamp TIMESTAMPTZ,
  admin_id UUID,
  admin_name TEXT,
  action_type TEXT,
  item_id TEXT,
  valuation_method TEXT,
  override_amount NUMERIC,
  change_reason TEXT,
  change_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    aal.created_at as change_timestamp,
    aal.admin_id,
    p.full_name as admin_name,
    aal.action_type,
    (aal.action_details->>'item_id')::TEXT as item_id,
    (aal.action_details->>'valuation_method')::TEXT as valuation_method,
    (aal.action_details->>'override_amount')::NUMERIC as override_amount,
    (aal.action_details->>'change_reason')::TEXT as change_reason,
    aal.action_details as change_details
  FROM admin_activity_log aal
  LEFT JOIN profiles p ON aal.admin_id = p.id
  WHERE aal.target_id = quote_id_param
    AND aal.action_type IN ('valuation_method_change', 'valuation_override')
  ORDER BY aal.created_at DESC
  LIMIT limit_records;
END;
$$;

-- Function: Clear valuation preferences for an item
CREATE OR REPLACE FUNCTION clear_item_valuation_preferences(
  p_quote_id TEXT,
  p_item_id TEXT,
  p_admin_id TEXT,
  p_clear_reason TEXT DEFAULT 'Reset to system defaults'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  admin_has_permission BOOLEAN;
BEGIN
  -- Validate admin permissions
  SELECT EXISTS(
    SELECT 1 FROM user_roles 
    WHERE user_id::TEXT = p_admin_id AND role IN ('admin', 'moderator')
  ) INTO admin_has_permission;
  
  IF NOT admin_has_permission THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions',
      'admin_id', p_admin_id
    );
  END IF;
  
  -- Log the clearing action
  INSERT INTO admin_activity_log (
    admin_id,
    action_type,
    target_type,
    target_id,
    action_details,
    created_at
  ) VALUES (
    p_admin_id::UUID,
    'valuation_preferences_cleared',
    'quote_item',
    p_quote_id::UUID,
    jsonb_build_object(
      'item_id', p_item_id,
      'clear_reason', p_clear_reason,
      'timestamp', NOW(),
      'component_source', 'PerItemValuationSelector'
    ),
    NOW()
  );
  
  -- Remove from operational_data
  UPDATE quotes 
  SET 
    operational_data = operational_data 
      - ('item_valuation_preferences.' || p_item_id)
      - ('item_valuation_overrides.' || p_item_id),
    updated_at = NOW()
  WHERE id = p_quote_id::UUID;
  
  RETURN jsonb_build_object(
    'success', true,
    'cleared_at', NOW(),
    'quote_id', p_quote_id,
    'item_id', p_item_id,
    'admin_id', p_admin_id
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'quote_id', p_quote_id,
      'item_id', p_item_id
    );
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION log_valuation_method_change(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION log_valuation_override(TEXT, TEXT, TEXT, NUMERIC, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_quote_valuation_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_valuation_change_history(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_item_valuation_preferences(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION log_valuation_method_change IS 'Logs per-item valuation method changes with admin audit trail';
COMMENT ON FUNCTION log_valuation_override IS 'Logs admin valuation amount overrides for individual items';
COMMENT ON FUNCTION get_quote_valuation_preferences IS 'Retrieves all valuation preferences and overrides for items in a quote';
COMMENT ON FUNCTION get_valuation_change_history IS 'Gets chronological history of valuation changes for a quote';
COMMENT ON FUNCTION clear_item_valuation_preferences IS 'Clears valuation preferences and overrides for an item, reverting to defaults';