-- Migration to sync OAuth profile data (avatar/picture) to profiles table
-- This ensures Google/Facebook profile pictures are saved to profiles.avatar_url

-- Create or replace function to sync OAuth profile data
CREATE OR REPLACE FUNCTION sync_oauth_profile_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if user has OAuth metadata
  IF NEW.raw_user_meta_data IS NOT NULL THEN
    -- Extract profile data from OAuth metadata
    DECLARE
      oauth_name TEXT;
      oauth_avatar TEXT;
    BEGIN
      -- Get name (try multiple possible fields)
      oauth_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        CASE 
          WHEN NEW.raw_user_meta_data->>'given_name' IS NOT NULL AND NEW.raw_user_meta_data->>'family_name' IS NOT NULL
          THEN (NEW.raw_user_meta_data->>'given_name') || ' ' || (NEW.raw_user_meta_data->>'family_name')
          ELSE NULL
        END,
        NULL
      );
      
      -- Get avatar URL (try multiple possible fields)
      oauth_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NEW.raw_user_meta_data->>'profile_picture',
        NULL
      );
      
      -- Update or insert profile data
      INSERT INTO public.profiles (
        id,
        full_name,
        avatar_url,
        email,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        oauth_name,
        oauth_avatar,
        NEW.email,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET 
        -- Only update if the OAuth data is not null and profile field is null
        full_name = CASE 
          WHEN profiles.full_name IS NULL AND oauth_name IS NOT NULL 
          THEN oauth_name 
          ELSE profiles.full_name 
        END,
        avatar_url = CASE 
          WHEN profiles.avatar_url IS NULL AND oauth_avatar IS NOT NULL 
          THEN oauth_avatar 
          ELSE profiles.avatar_url 
        END,
        updated_at = NOW();
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_oauth_profile_data_trigger ON auth.users;

-- Create trigger to sync OAuth data on user creation or update
CREATE TRIGGER sync_oauth_profile_data_trigger
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_oauth_profile_data();

-- Run sync for existing OAuth users
UPDATE auth.users 
SET updated_at = NOW()
WHERE raw_user_meta_data IS NOT NULL
AND (
  raw_user_meta_data->>'avatar_url' IS NOT NULL OR
  raw_user_meta_data->>'picture' IS NOT NULL OR
  raw_user_meta_data->>'name' IS NOT NULL OR
  raw_user_meta_data->>'full_name' IS NOT NULL
);

-- Verify the sync by checking profiles with avatar URLs
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.avatar_url,
  u.raw_user_meta_data->>'picture' as oauth_picture,
  u.raw_user_meta_data->>'avatar_url' as oauth_avatar,
  u.raw_user_meta_data->>'name' as oauth_name
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.raw_user_meta_data IS NOT NULL
LIMIT 10;