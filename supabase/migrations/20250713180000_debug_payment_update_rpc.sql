-- Debug and fix the force_update_payment RPC function
-- Add better logging and error handling

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

  -- Check if quote exists
  IF NOT EXISTS (SELECT 1 FROM quotes WHERE id = quote_id) THEN
    RAISE EXCEPTION 'Quote not found: %', quote_id;
  END IF;

  -- Log before update
  RAISE NOTICE 'Quote exists, proceeding with update...';

  -- Perform the update with explicit transaction
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
    RAISE EXCEPTION 'No rows updated - quote ID may be invalid: %', quote_id;
  END IF;
  
  -- Get the updated record
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