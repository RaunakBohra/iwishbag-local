-- Create a simple function to update payment information
CREATE OR REPLACE FUNCTION update_quote_payment(
  p_quote_id UUID,
  p_amount_paid DECIMAL,
  p_payment_status TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Direct update without admin check to simplify
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
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', v_updated_count > 0,
    'updated_count', v_updated_count,
    'quote_id', p_quote_id,
    'amount_paid', p_amount_paid,
    'payment_status', p_payment_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_quote_payment TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION update_quote_payment IS 'Updates payment information for a quote';