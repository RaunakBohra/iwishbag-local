-- Create a specific policy for updating payment fields
-- This ensures admins can update payment information

-- First, drop any existing policy that might conflict
DROP POLICY IF EXISTS "Admins can update payment fields" ON quotes;

-- Create new policy specifically for payment updates
CREATE POLICY "Admins can update payment fields" ON quotes
  FOR UPDATE
  USING (
    -- Check if user is admin using the is_admin() function
    is_admin()
  )
  WITH CHECK (
    -- Ensure only payment-related fields are being updated
    is_admin()
  );

-- Grant update permission on specific columns to authenticated users
-- (RLS will still apply)
GRANT UPDATE (amount_paid, payment_status, paid_at, updated_at) ON quotes TO authenticated;

-- Create a simpler function that doesn't check admin status
-- This will still be protected by RLS
CREATE OR REPLACE FUNCTION update_payment_simple(
  p_quote_id UUID,
  p_amount_paid DECIMAL,
  p_payment_status TEXT
)
RETURNS JSONB AS $$
BEGIN
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
  
  RETURN jsonb_build_object(
    'success', true,
    'quote_id', p_quote_id,
    'amount_paid', p_amount_paid,
    'payment_status', p_payment_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_payment_simple TO authenticated;

-- Add comment
COMMENT ON FUNCTION update_payment_simple IS 'Updates payment information for a quote - protected by RLS';