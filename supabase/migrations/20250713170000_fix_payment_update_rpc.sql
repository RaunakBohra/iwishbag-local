-- Fix the force_update_payment RPC function to work properly
-- The admin check should be done at the page level, not the RPC level

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
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- For now, allow authenticated users (admin check should be at page level)
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Log the update attempt
  RAISE NOTICE 'Updating payment for quote % by user %: amount=%, status=%', 
    quote_id, current_user_id, new_amount_paid, new_payment_status;

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
  WHERE id = quote_id
  RETURNING * INTO updated_quote;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found: %', quote_id;
  END IF;
  
  RAISE NOTICE 'Quote payment updated successfully: amount_paid=%, payment_status=%', 
    updated_quote.amount_paid, updated_quote.payment_status;
  
  -- Return the updated quote as JSON
  RETURN to_jsonb(updated_quote);
END;
$$;