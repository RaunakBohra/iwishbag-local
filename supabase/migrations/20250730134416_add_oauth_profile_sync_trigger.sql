-- Create trigger to sync OAuth user data to profiles table on user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also create a function to sync existing OAuth users' avatar URLs
CREATE OR REPLACE FUNCTION sync_oauth_avatars_to_profiles()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  avatar_url_value TEXT;
BEGIN
  -- Loop through all users with OAuth metadata
  FOR user_record IN 
    SELECT 
      id,
      raw_user_meta_data,
      COALESCE(
        raw_user_meta_data->>'avatar_url',
        raw_user_meta_data->>'picture'
      ) as oauth_avatar_url
    FROM auth.users
    WHERE raw_user_meta_data IS NOT NULL
      AND (raw_user_meta_data ? 'avatar_url' OR raw_user_meta_data ? 'picture')
  LOOP
    -- Update the profile with the OAuth avatar URL if not already set
    UPDATE public.profiles
    SET 
      avatar_url = COALESCE(avatar_url, user_record.oauth_avatar_url),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = user_record.id
      AND (avatar_url IS NULL OR avatar_url = '');
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function once to update existing users
SELECT sync_oauth_avatars_to_profiles();

-- Also ensure the profile sync function is called on user updates (for when users link OAuth later)
CREATE OR REPLACE FUNCTION handle_user_update() 
RETURNS TRIGGER AS $$
BEGIN
  -- If user metadata has changed and includes avatar URL
  IF (NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data) 
    AND (NEW.raw_user_meta_data ? 'avatar_url' OR NEW.raw_user_meta_data ? 'picture') THEN
    
    -- Update the profile with new OAuth data
    UPDATE public.profiles
    SET 
      avatar_url = COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        avatar_url
      ),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user updates
CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_update();

COMMENT ON FUNCTION sync_oauth_avatars_to_profiles() IS 'Syncs OAuth avatar URLs from auth.users metadata to profiles table';
COMMENT ON FUNCTION handle_user_update() IS 'Handles updates to auth.users including OAuth metadata changes';