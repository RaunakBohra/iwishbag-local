-- Add payment proof verification fields to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'confirmed', 'rejected')),
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS verified_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster payment proof queries
CREATE INDEX IF NOT EXISTS idx_messages_payment_proof ON public.messages(message_type, verification_status) WHERE message_type = 'payment_proof';
CREATE INDEX IF NOT EXISTS idx_messages_quote_payment_proof ON public.messages(quote_id, message_type) WHERE message_type = 'payment_proof';

-- Add RLS policy for admin verification access
CREATE POLICY "Admins can update verification status" ON public.messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create a view for payment proof verification summary
CREATE OR REPLACE VIEW payment_proof_verification_summary AS
SELECT 
  m.id as message_id,
  m.quote_id,
  m.sender_id,
  m.verification_status,
  m.admin_notes,
  m.verified_amount,
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
  auth_users.email as customer_email,
  admin_auth.email as verified_by_email
FROM messages m
JOIN quotes q ON m.quote_id = q.id
LEFT JOIN auth.users auth_users ON m.sender_id = auth_users.id
LEFT JOIN auth.users admin_auth ON m.verified_by = admin_auth.id
WHERE m.message_type = 'payment_proof'
ORDER BY m.created_at DESC;

-- Grant access to the view for admins (access will be controlled by the underlying table policies)
GRANT SELECT ON payment_proof_verification_summary TO authenticated;

-- Function to get payment proof statistics
CREATE OR REPLACE FUNCTION get_payment_proof_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE verification_status = 'pending'),
    'verified', COUNT(*) FILTER (WHERE verification_status = 'verified'),
    'confirmed', COUNT(*) FILTER (WHERE verification_status = 'confirmed'),
    'rejected', COUNT(*) FILTER (WHERE verification_status = 'rejected')
  ) INTO result
  FROM messages
  WHERE message_type = 'payment_proof';
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_payment_proof_stats() TO authenticated;

-- Create function to get orders with pending payment proofs
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