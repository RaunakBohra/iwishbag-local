-- ============================================================================
-- FIX DELETE HSN MASTER FUNCTION - Use correct table name
-- ============================================================================

-- Drop and recreate with correct table reference
CREATE OR REPLACE FUNCTION delete_hsn_master_record(p_hsn_code VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can delete HSN master records';
  END IF;

  -- Check if HSN code is being used in any quotes
  IF EXISTS (
    SELECT 1 FROM quotes 
    WHERE items @> jsonb_build_array(jsonb_build_object('hsn_code', p_hsn_code))
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Cannot delete HSN code % - it is being used in existing quotes', p_hsn_code;
  END IF;

  -- Delete the HSN record
  DELETE FROM hsn_master 
  WHERE hsn_code = p_hsn_code;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HSN code % not found', p_hsn_code;
  END IF;

  -- Refresh the search cache if it exists
  BEGIN
    PERFORM refresh_hsn_search_cache();
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but continue
    RAISE NOTICE 'Could not refresh HSN search cache: %', SQLERRM;
  END;

  RETURN true;
END;
$$;