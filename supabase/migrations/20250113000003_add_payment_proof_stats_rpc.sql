-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS get_payment_proof_stats();

-- Create RPC function to get payment proof statistics
CREATE OR REPLACE FUNCTION get_payment_proof_stats()
RETURNS TABLE (
  total INTEGER,
  pending INTEGER,
  verified INTEGER,
  confirmed INTEGER,
  rejected INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total,
    COUNT(*) FILTER (WHERE verification_status IS NULL OR verification_status = 'pending')::INTEGER as pending,
    COUNT(*) FILTER (WHERE verification_status = 'verified')::INTEGER as verified,
    COUNT(*) FILTER (WHERE verification_status = 'confirmed')::INTEGER as confirmed,
    COUNT(*) FILTER (WHERE verification_status = 'rejected')::INTEGER as rejected
  FROM messages
  WHERE message_type = 'payment_proof';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_payment_proof_stats TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_payment_proof_stats IS 'Returns statistics about payment proof messages';