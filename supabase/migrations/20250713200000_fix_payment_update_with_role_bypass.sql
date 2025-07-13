-- Create a more aggressive payment update function that bypasses ALL RLS
-- by using service role privileges

CREATE OR REPLACE FUNCTION force_update_payment(
  quote_id UUID,
  new_amount_paid DECIMAL,
  new_payment_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_quote RECORD;
  current_user_id UUID;
  rows_affected INTEGER;
  original_role TEXT;
BEGIN
  -- Get current user for logging
  current_user_id := auth.uid();
  
  -- Log the attempt
  RAISE NOTICE 'Starting payment update - User: %, Quote: %, Amount: %, Status: %', 
    current_user_id, quote_id, new_amount_paid, new_payment_status;
  
  -- Check authentication
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required - no user found';
  END IF;

  -- Check if quote exists first (this works with RLS)
  IF NOT EXISTS (SELECT 1 FROM quotes WHERE id = quote_id) THEN
    RAISE EXCEPTION 'Quote not found or access denied: %', quote_id;
  END IF;

  -- CRITICAL: Switch to service_role to bypass ALL RLS policies
  -- Store original role
  SELECT current_setting('role') INTO original_role;
  
  -- Switch to service_role (this bypasses ALL RLS)
  PERFORM set_config('role', 'service_role', true);
  
  -- Also disable RLS completely for this session
  SET LOCAL row_security = off;

  -- Log before update
  RAISE NOTICE 'Bypassing RLS, proceeding with update as service_role...';

  -- Perform the update with service_role privileges
  UPDATE quotes
  SET 
    amount_paid = new_amount_paid,
    payment_status = new_payment_status,
    paid_at = CASE 
      WHEN new_payment_status IN ('paid', 'overpaid') THEN NOW()
      ELSE paid_at
    END,
    updated_at = NOW()
  WHERE id = quote_id;
  
  -- Check how many rows were affected
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RAISE NOTICE 'Rows affected by update: %', rows_affected;
  
  IF rows_affected = 0 THEN
    RAISE EXCEPTION 'No rows updated - quote may not exist: %', quote_id;
  END IF;
  
  -- Get the updated record (still as service_role)
  SELECT * INTO updated_quote FROM quotes WHERE id = quote_id;
  
  -- Restore original role
  PERFORM set_config('role', original_role, true);
  
  -- Log the result
  RAISE NOTICE 'Update successful - New amount_paid: %, New payment_status: %', 
    updated_quote.amount_paid, updated_quote.payment_status;
  
  -- Return the updated quote as JSON
  RETURN jsonb_build_object(
    'success', true,
    'quote_id', updated_quote.id,
    'amount_paid', updated_quote.amount_paid,
    'payment_status', updated_quote.payment_status,
    'updated_at', updated_quote.updated_at,
    'rows_affected', rows_affected
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Ensure we restore the original role even on error
    BEGIN
      PERFORM set_config('role', original_role, true);
    EXCEPTION 
      WHEN OTHERS THEN
        -- Ignore errors in role restoration
        NULL;
    END;
    
    RAISE NOTICE 'Error in force_update_payment: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION force_update_payment TO authenticated;
GRANT EXECUTE ON FUNCTION force_update_payment TO anon;