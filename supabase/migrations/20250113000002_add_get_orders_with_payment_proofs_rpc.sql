-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS get_orders_with_payment_proofs(TEXT, INTEGER);

-- Create RPC function to get orders with payment proofs
CREATE OR REPLACE FUNCTION get_orders_with_payment_proofs(
  status_filter TEXT DEFAULT 'pending',
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  order_id UUID,
  order_display_id TEXT,
  final_total NUMERIC,
  final_currency TEXT,
  payment_status TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  message_id UUID,
  verification_status TEXT,
  admin_notes TEXT,
  attachment_file_name TEXT,
  attachment_url TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  customer_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (q.id)
    q.id as order_id,
    COALESCE(q.order_display_id, 'Q' || SUBSTRING(q.id::TEXT, 1, 8)) as order_display_id,
    q.final_total,
    q.final_currency,
    q.payment_status,
    m.created_at as submitted_at,
    m.id as message_id,
    m.verification_status,
    m.admin_notes,
    m.attachment_file_name,
    m.attachment_url,
    m.verified_at,
    q.user_id as customer_id
  FROM messages m
  INNER JOIN quotes q ON q.id = m.quote_id
  WHERE m.message_type = 'payment_proof'
    AND (status_filter = 'all' OR m.verification_status = status_filter OR (status_filter = 'pending' AND m.verification_status IS NULL))
  ORDER BY q.id, m.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_orders_with_payment_proofs TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_orders_with_payment_proofs IS 'Retrieves orders that have payment proof messages, with optional status filtering';