-- Migration: Remove phone column from profiles table
-- Phone numbers are now stored in auth.users.phone (Supabase best practice)

-- Step 1: Drop the sync trigger first
DROP TRIGGER IF EXISTS sync_phone_to_auth_trigger ON profiles;

-- Step 2: Drop the sync function
DROP FUNCTION IF EXISTS sync_phone_to_auth_users();

-- Step 3: Remove the phone column from profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS phone;

-- Step 4: Add comment for reference
COMMENT ON TABLE profiles IS 
'User profiles table - phone numbers are stored in auth.users.phone, not here';

-- Step 5: Create a view for backward compatibility (optional)
-- This view joins profiles with auth.users to provide phone access if needed
CREATE OR REPLACE VIEW profiles_with_phone AS
SELECT 
  p.*,
  au.phone
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id;

-- Grant access to the view
GRANT SELECT ON profiles_with_phone TO authenticated;
GRANT SELECT ON profiles_with_phone TO anon;

-- Note: Views don't support RLS directly, they inherit from underlying tables
-- The view will use the RLS policies from the profiles table