-- Add phone and phone_verified columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Update RLS policies to include phone-based access
CREATE OR REPLACE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE OR REPLACE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create function to get or create user profile by phone
CREATE OR REPLACE FUNCTION get_or_create_profile_by_phone(
  phone_number TEXT,
  user_id UUID DEFAULT NULL
)
RETURNS profiles AS $$
DECLARE
  profile_record profiles;
BEGIN
  -- Try to find existing profile with this phone
  SELECT * INTO profile_record
  FROM profiles
  WHERE phone = phone_number
  LIMIT 1;
  
  -- If found, return it
  IF FOUND THEN
    RETURN profile_record;
  END IF;
  
  -- If not found and user_id provided, create new profile
  IF user_id IS NOT NULL THEN
    INSERT INTO profiles (id, phone, phone_verified)
    VALUES (user_id, phone_number, true)
    RETURNING * INTO profile_record;
    
    RETURN profile_record;
  END IF;
  
  -- No profile found and no user_id provided
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;