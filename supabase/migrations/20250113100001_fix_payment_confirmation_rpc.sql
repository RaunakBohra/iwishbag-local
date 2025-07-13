-- Drop the existing function
DROP FUNCTION IF EXISTS confirm_payment_from_proof(UUID, DECIMAL, TEXT);

-- Create a simplified version that checks admin status differently
CREATE OR REPLACE FUNCTION confirm_payment_from_proof(
  p_quote_id UUID,
  p_amount_paid DECIMAL,
  p_payment_status TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_current_amount DECIMAL;
  v_final_total DECIMAL;
  v_user_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user is admin by directly querying user_roles table
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_user_id 
    AND role = 'admin'
  ) INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can confirm payments. User % is not an admin', v_user_id;
  END IF;

  -- Get current quote details
  SELECT amount_paid, final_total 
  INTO v_current_amount, v_final_total
  FROM quotes 
  WHERE id = p_quote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote % not found', p_quote_id;
  END IF;

  -- Update the quote with payment information
  UPDATE quotes
  SET 
    amount_paid = p_amount_paid,
    payment_status = p_payment_status,
    paid_at = CASE 
      WHEN p_payment_status IN ('paid', 'overpaid') THEN NOW() 
      ELSE paid_at 
    END,
    updated_at = NOW()
  WHERE id = p_quote_id;

  -- Return success with details
  v_result := jsonb_build_object(
    'success', true,
    'quote_id', p_quote_id,
    'amount_paid', p_amount_paid,
    'payment_status', p_payment_status,
    'previous_amount', v_current_amount,
    'final_total', v_final_total,
    'user_id', v_user_id,
    'is_admin', v_is_admin
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', v_user_id,
      'is_admin', v_is_admin
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION confirm_payment_from_proof TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION confirm_payment_from_proof IS 'Securely updates payment information for a quote when confirming payment from a payment proof. Only admins can execute this function.';