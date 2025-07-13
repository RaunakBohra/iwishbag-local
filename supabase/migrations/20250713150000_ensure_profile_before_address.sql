-- Add a function to ensure user profile exists before address operations
-- This helps prevent foreign key constraint violations

CREATE OR REPLACE FUNCTION ensure_user_profile_exists(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = _user_id) THEN
    -- Create a basic profile if it doesn't exist
    INSERT INTO profiles (id, created_at, updated_at)
    VALUES (_user_id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a trigger to ensure profile exists before inserting address
CREATE OR REPLACE FUNCTION before_address_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure the user profile exists
  PERFORM ensure_user_profile_exists(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS ensure_profile_before_address ON user_addresses;
CREATE TRIGGER ensure_profile_before_address
  BEFORE INSERT ON user_addresses
  FOR EACH ROW EXECUTE FUNCTION before_address_insert();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION ensure_user_profile_exists(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION before_address_insert() TO authenticated;