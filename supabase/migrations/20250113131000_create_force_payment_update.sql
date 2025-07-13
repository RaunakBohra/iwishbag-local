-- Create a function that forces payment update by using SECURITY DEFINER
-- This bypasses RLS completely when called by authenticated users

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
  is_admin BOOLEAN;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = current_user_id
    AND role = 'admin'
  ) INTO is_admin;
  
  -- Only allow admins to use this function
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only admins can update payments';
  END IF;

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
    RAISE EXCEPTION 'Quote not found';
  END IF;
  
  -- Return the updated quote as JSON
  RETURN to_jsonb(updated_quote);
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside)
GRANT EXECUTE ON FUNCTION force_update_payment TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION force_update_payment IS 'Force payment update for admins only - bypasses RLS';