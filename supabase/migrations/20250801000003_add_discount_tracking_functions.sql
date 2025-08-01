-- Add RPC function to increment discount code usage count
CREATE OR REPLACE FUNCTION increment_discount_usage(p_discount_code_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE discount_codes
  SET usage_count = usage_count + 1
  WHERE id = p_discount_code_id;
END;
$$;

-- Add comment
COMMENT ON FUNCTION increment_discount_usage IS 'Increments the usage count for a discount code';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_discount_usage TO authenticated;