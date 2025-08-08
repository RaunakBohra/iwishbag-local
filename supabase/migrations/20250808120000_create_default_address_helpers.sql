-- Migration to add helper functions for default address management
-- Part of the default address enhancement (Amazon/Shopify pattern implementation)

-- Function to get users who have addresses but no default address
CREATE OR REPLACE FUNCTION get_users_without_default_address()
RETURNS TABLE (
  user_id UUID,
  address_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.user_id,
    COUNT(*) as address_count
  FROM delivery_addresses da
  WHERE da.user_id NOT IN (
    SELECT DISTINCT da2.user_id 
    FROM delivery_addresses da2 
    WHERE da2.is_default = true
  )
  GROUP BY da.user_id
  ORDER BY address_count DESC;
END;
$$;

-- Function to automatically set first address as default for users without default
CREATE OR REPLACE FUNCTION fix_missing_default_addresses()
RETURNS TABLE (
  user_id UUID,
  address_id UUID,
  success BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  first_address_record RECORD;
BEGIN
  -- Loop through users without default addresses
  FOR user_record IN 
    SELECT * FROM get_users_without_default_address()
  LOOP
    -- Get their first (oldest) address
    SELECT id INTO first_address_record
    FROM delivery_addresses
    WHERE delivery_addresses.user_id = user_record.user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF first_address_record.id IS NOT NULL THEN
      -- Set it as default
      UPDATE delivery_addresses
      SET is_default = true
      WHERE id = first_address_record.id;
      
      -- Return success record
      user_id := user_record.user_id;
      address_id := first_address_record.id;
      success := true;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Add a comment to track this enhancement
COMMENT ON FUNCTION get_users_without_default_address() IS 'Helper function for default address enhancement - identifies users who need a default address set';
COMMENT ON FUNCTION fix_missing_default_addresses() IS 'Fixes users who have addresses but no default address by setting their first address as default';

-- Create an index to optimize default address queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_default 
ON delivery_addresses (user_id, is_default) 
WHERE is_default = true;