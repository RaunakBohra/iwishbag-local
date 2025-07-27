-- ============================================================================
-- FIX APPROVE FUNCTION - Handle materialized view refresh properly
-- ============================================================================

-- Fix the refresh_hsn_search_cache function to handle non-concurrent refresh
CREATE OR REPLACE FUNCTION refresh_hsn_search_cache()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Try concurrent refresh first (requires unique index)
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY hsn_search_optimized;
  EXCEPTION WHEN OTHERS THEN
    -- Fall back to regular refresh if concurrent fails
    REFRESH MATERIALIZED VIEW hsn_search_optimized;
  END;
END;
$$;

-- Update approve function to handle refresh errors gracefully
CREATE OR REPLACE FUNCTION approve_hsn_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request user_hsn_requests%ROWTYPE;
BEGIN
  -- Check if user is admin using user_roles table
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can approve HSN requests';
  END IF;

  -- Get the request
  SELECT * INTO v_request FROM user_hsn_requests WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'HSN request not found or already processed';
  END IF;

  -- Insert into hsn_master
  INSERT INTO hsn_master (
    hsn_code, description, category, subcategory, keywords,
    weight_data, tax_data, minimum_valuation_usd, 
    requires_currency_conversion, is_active
  ) VALUES (
    v_request.hsn_code, v_request.description, v_request.category, 
    v_request.subcategory, v_request.keywords, v_request.weight_data, 
    v_request.tax_data, v_request.minimum_valuation_usd, 
    v_request.requires_currency_conversion, true
  );

  -- Update request status
  UPDATE user_hsn_requests 
  SET 
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = NOW()
  WHERE id = request_id;

  -- Try to refresh HSN search cache, but don't fail if it errors
  BEGIN
    PERFORM refresh_hsn_search_cache();
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but continue
    RAISE NOTICE 'Could not refresh HSN search cache: %', SQLERRM;
  END;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to approve HSN request: %', SQLERRM;
END;
$$;