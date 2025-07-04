-- Migration: Fix Existing User Names
-- Date: 2025-07-10
-- Description: Updates existing user profiles with names from user metadata

-- Function to fix existing user names
CREATE OR REPLACE FUNCTION fix_existing_user_names()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  user_name TEXT;
BEGIN
  -- Loop through all profiles that don't have a full_name or have a default name
  FOR user_record IN 
    SELECT p.id, p.full_name
    FROM profiles p 
    WHERE p.full_name IS NULL 
       OR p.full_name = 'User'
       OR p.full_name = ''
  LOOP
    -- Get name from auth.users metadata
    SELECT COALESCE(
      au.raw_user_meta_data->>'name',
      au.raw_user_meta_data->>'full_name'
    ) INTO user_name
    FROM auth.users au 
    WHERE au.id = user_record.id;
    
    -- Update profile if we found a name
    IF user_name IS NOT NULL AND user_name != '' THEN
      UPDATE profiles 
      SET full_name = user_name
      WHERE id = user_record.id;
      
      RAISE NOTICE 'Updated user % with name: %', user_record.id, user_name;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the fix
SELECT fix_existing_user_names();

-- Drop the temporary function
DROP FUNCTION fix_existing_user_names(); 