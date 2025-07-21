-- Migration: Move phone numbers from profiles.phone to auth.users.phone
-- This aligns with Supabase best practices for storing phone numbers

-- Step 1: Update auth.users with phone numbers from profiles
-- We need to use a function because we can't directly update auth.users in a migration
CREATE OR REPLACE FUNCTION migrate_phone_to_auth_users()
RETURNS void AS $$
DECLARE
  profile_record RECORD;
BEGIN
  -- Loop through all profiles that have phone numbers
  FOR profile_record IN 
    SELECT id, phone 
    FROM profiles 
    WHERE phone IS NOT NULL AND phone != ''
  LOOP
    -- Update the corresponding auth.users record
    UPDATE auth.users 
    SET phone = profile_record.phone,
        updated_at = now()
    WHERE id = profile_record.id;
  END LOOP;
  
  -- Log the migration
  RAISE NOTICE 'Phone migration completed. Updated % users', 
    (SELECT COUNT(*) FROM profiles WHERE phone IS NOT NULL AND phone != '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the migration function
SELECT migrate_phone_to_auth_users();

-- Step 2: Create trigger to keep auth.users.phone in sync with profile updates
-- This ensures backward compatibility during transition period
CREATE OR REPLACE FUNCTION sync_phone_to_auth_users()
RETURNS TRIGGER AS $$
BEGIN
  -- When profile phone is updated, update auth.users.phone as well
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    UPDATE auth.users 
    SET phone = NEW.phone,
        updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for profile phone updates
DROP TRIGGER IF EXISTS sync_phone_to_auth_trigger ON profiles;
CREATE TRIGGER sync_phone_to_auth_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_phone_to_auth_users();

-- Step 3: Add comment for future reference
COMMENT ON FUNCTION migrate_phone_to_auth_users() IS 
'One-time migration function to move phone numbers from profiles.phone to auth.users.phone';

COMMENT ON FUNCTION sync_phone_to_auth_users() IS 
'Temporary sync function to keep auth.users.phone updated when profiles.phone changes during migration period';

-- Step 4: Grant necessary permissions
-- Note: This migration requires superuser privileges to update auth.users
-- In production, this should be run by a database administrator

-- Clean up the migration function (no longer needed after execution)
DROP FUNCTION migrate_phone_to_auth_users();