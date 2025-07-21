-- Migration: Extract phone numbers from OAuth metadata and save to auth.users.phone
-- Supports Google and Facebook OAuth phone data extraction

-- Function to extract phone from OAuth metadata
CREATE OR REPLACE FUNCTION extract_oauth_phone_to_auth_users()
RETURNS TRIGGER AS $$
DECLARE
  extracted_phone text;
BEGIN
  -- Extract phone from various OAuth metadata fields
  extracted_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',           -- Google OAuth phone
    NEW.raw_user_meta_data->>'phone_number',    -- Alternative Google format
    NEW.raw_user_meta_data->>'mobile_phone',    -- Facebook mobile_phone
    NEW.user_metadata->>'phone',                -- Fallback user_metadata phone
    NEW.user_metadata->>'phone_number'          -- Alternative user_metadata format
  );

  -- Only update if we found a phone number and it's not already set
  IF extracted_phone IS NOT NULL AND extracted_phone != '' AND NEW.phone IS NULL THEN
    -- Update the phone field in the same record
    NEW.phone := extracted_phone;
    
    -- Log the extraction for debugging
    RAISE NOTICE 'OAuth phone extracted for user %: %', NEW.id, extracted_phone;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for OAuth phone extraction during user creation
DROP TRIGGER IF EXISTS on_oauth_phone_extraction ON auth.users;
CREATE TRIGGER on_oauth_phone_extraction
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION extract_oauth_phone_to_auth_users();

-- Also create an update trigger for existing users who add OAuth providers
CREATE OR REPLACE FUNCTION update_oauth_phone_to_auth_users()
RETURNS TRIGGER AS $$
DECLARE
  extracted_phone text;
BEGIN
  -- Only process if metadata changed and phone is not already set
  IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data AND NEW.phone IS NULL THEN
    
    -- Extract phone from various OAuth metadata fields
    extracted_phone := COALESCE(
      NEW.raw_user_meta_data->>'phone',           -- Google OAuth phone
      NEW.raw_user_meta_data->>'phone_number',    -- Alternative Google format
      NEW.raw_user_meta_data->>'mobile_phone',    -- Facebook mobile_phone
      NEW.user_metadata->>'phone',                -- Fallback user_metadata phone
      NEW.user_metadata->>'phone_number'          -- Alternative user_metadata format
    );

    -- Update phone if we found one
    IF extracted_phone IS NOT NULL AND extracted_phone != '' THEN
      NEW.phone := extracted_phone;
      
      -- Log the extraction for debugging
      RAISE NOTICE 'OAuth phone updated for existing user %: %', NEW.id, extracted_phone;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create update trigger for OAuth phone extraction
DROP TRIGGER IF EXISTS on_oauth_phone_update ON auth.users;
CREATE TRIGGER on_oauth_phone_update
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_oauth_phone_to_auth_users();

-- Add comments for documentation
COMMENT ON FUNCTION extract_oauth_phone_to_auth_users() IS 
'Extracts phone numbers from OAuth provider metadata (Google, Facebook) and saves to auth.users.phone during user creation';

COMMENT ON FUNCTION update_oauth_phone_to_auth_users() IS 
'Extracts phone numbers from OAuth provider metadata when existing users link new OAuth providers';

-- Note: These triggers automatically extract phone numbers from:
-- - Google OAuth: raw_user_meta_data.phone or raw_user_meta_data.phone_number
-- - Facebook OAuth: raw_user_meta_data.mobile_phone
-- - Manual signup: user_metadata.phone (already handled by existing code)
--
-- Phone extraction priority:
-- 1. raw_user_meta_data.phone (Google primary)
-- 2. raw_user_meta_data.phone_number (Google alternative) 
-- 3. raw_user_meta_data.mobile_phone (Facebook)
-- 4. user_metadata.phone (manual/fallback)
-- 5. user_metadata.phone_number (manual/fallback alternative)