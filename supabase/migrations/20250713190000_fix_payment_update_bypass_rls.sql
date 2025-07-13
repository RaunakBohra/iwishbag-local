-- Create a payment update function that properly bypasses RLS
-- The issue is that RLS policies are still being applied even with SECURITY DEFINER

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
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Log the attempt
  RAISE NOTICE 'Starting payment update - User: %, Quote: %, Amount: %, Status: %', 
    current_user_id, quote_id, new_amount_paid, new_payment_status;
  
  -- Check authentication
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required - no user found';
  END IF;

  -- Check if quote exists (without RLS)
  PERFORM 1 FROM quotes WHERE id = quote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', quote_id;
  END IF;

  -- Log before update
  RAISE NOTICE 'Quote exists, proceeding with update...';

  -- CRITICAL: Temporarily disable RLS for this function
  -- This is necessary because RLS policies are still being applied
  SET LOCAL row_security = off;

  -- Perform the update 
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
    RAISE EXCEPTION 'No rows updated - this should not happen';
  END IF;
  
  -- Get the updated record (with RLS still disabled)
  SELECT * INTO updated_quote FROM quotes WHERE id = quote_id;
  
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
    RAISE NOTICE 'Error in force_update_payment: %', SQLERRM;
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;