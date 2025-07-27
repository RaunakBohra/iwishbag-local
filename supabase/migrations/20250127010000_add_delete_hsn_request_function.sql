-- ============================================================================
-- ADD DELETE FUNCTION FOR HSN REQUESTS
-- ============================================================================

-- Function to delete HSN request (admin only)
CREATE OR REPLACE FUNCTION delete_hsn_request(request_id UUID)
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
    RAISE EXCEPTION 'Only admins can delete HSN requests';
  END IF;

  -- Delete the request
  DELETE FROM user_hsn_requests 
  WHERE id = request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'HSN request not found';
  END IF;

  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_hsn_request(UUID) TO authenticated;

-- Add RLS policy for delete
CREATE POLICY "Admins can delete HSN requests" ON user_hsn_requests
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );