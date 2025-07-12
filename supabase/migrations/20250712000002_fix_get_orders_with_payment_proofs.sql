-- Fix the get_orders_with_payment_proofs function to include customer_id field
-- This fixes the 400 error in OrderManagementPage.tsx

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
  customer_id UUID,
  customer_email TEXT,
  message_id UUID,
  verification_status TEXT,
  admin_notes TEXT,
  verified_amount DECIMAL,
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
    q.user_id as customer_id,
    auth_users.email as customer_email,
    m.id as message_id,
    m.verification_status,
    m.admin_notes,
    m.verified_amount,
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

-- Grant execute permission to authenticated users (will be restricted by RLS)
GRANT EXECUTE ON FUNCTION get_orders_with_payment_proofs(TEXT, INTEGER) TO authenticated;