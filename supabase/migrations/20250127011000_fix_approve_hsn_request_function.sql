-- ============================================================================
-- FIX APPROVE HSN REQUEST FUNCTION - Use user_roles table instead of is_admin()
-- ============================================================================

-- Drop and recreate the approve function with fixed admin check
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

  -- Refresh HSN search cache if function exists
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'refresh_hsn_search_cache') THEN
    PERFORM refresh_hsn_search_cache();
  END IF;

  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to approve HSN request: %', SQLERRM;
END;
$$;

-- Also fix the reject function to use the same approach
CREATE OR REPLACE FUNCTION reject_hsn_request(request_id UUID, reason TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin using user_roles table
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can reject HSN requests';
  END IF;

  -- Update request status
  UPDATE user_hsn_requests 
  SET 
    status = 'rejected',
    rejection_reason = reason,
    approved_by = auth.uid(),
    approved_at = NOW()
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HSN request not found or already processed';
  END IF;

  RETURN true;
END;
$$;