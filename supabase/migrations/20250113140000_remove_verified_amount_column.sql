-- Remove verified_amount column as we now directly update amount_paid in quotes table
-- This simplifies the payment system to have a single source of truth

-- First, drop the view that references verified_amount
DROP VIEW IF EXISTS payment_proof_verification_summary;

-- Drop the function that references verified_amount
DROP FUNCTION IF EXISTS get_orders_with_payment_proofs(TEXT, INTEGER);

-- Now we can safely drop the column
ALTER TABLE public.messages 
DROP COLUMN IF EXISTS verified_amount;

-- Recreate the view without verified_amount
CREATE OR REPLACE VIEW payment_proof_verification_summary AS
SELECT 
  m.id as message_id,
  m.quote_id,
  m.sender_id,
  m.verification_status,
  m.admin_notes,
  m.verified_by,
  m.verified_at,
  m.attachment_file_name,
  m.attachment_url,
  m.created_at as submitted_at,
  q.order_display_id,
  q.final_total,
  q.final_currency,
  q.payment_status,
  q.payment_method,
  q.amount_paid,
  auth_users.email as customer_email,
  admin_auth.email as verified_by_email
FROM messages m
JOIN quotes q ON m.quote_id = q.id
LEFT JOIN auth.users auth_users ON m.sender_id = auth_users.id
LEFT JOIN auth.users admin_auth ON m.verified_by = admin_auth.id
WHERE m.message_type = 'payment_proof'
ORDER BY m.created_at DESC;

-- Grant access to the view
GRANT SELECT ON payment_proof_verification_summary TO authenticated;

-- Recreate the function without verified_amount
CREATE OR REPLACE FUNCTION get_orders_with_payment_proofs(
  status_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
  order_id UUID,
  order_display_id TEXT,
  final_total DECIMAL,
  final_currency TEXT,
  payment_status TEXT,
  payment_method TEXT,
  customer_email TEXT,
  customer_id UUID,
  message_id UUID,
  verification_status TEXT,
  admin_notes TEXT,
  amount_paid DECIMAL,
  attachment_file_name TEXT,
  attachment_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id as order_id,
    q.order_display_id,
    q.final_total,
    q.final_currency,
    q.payment_status,
    q.payment_method,
    auth_users.email as customer_email,
    q.user_id as customer_id,
    m.id as message_id,
    m.verification_status,
    m.admin_notes,
    q.amount_paid,
    m.attachment_file_name,
    m.attachment_url,
    m.created_at as submitted_at,
    m.verified_at
  FROM quotes q
  JOIN messages m ON q.id = m.quote_id
  LEFT JOIN auth.users auth_users ON q.user_id = auth_users.id
  WHERE m.message_type = 'payment_proof'
    AND (status_filter IS NULL OR m.verification_status = status_filter)
  ORDER BY m.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_orders_with_payment_proofs(TEXT, INTEGER) TO authenticated;

-- Add a comment explaining the change
COMMENT ON TABLE messages IS 'Messages table - verified_amount column removed in favor of directly updating quotes.amount_paid for simpler payment tracking';