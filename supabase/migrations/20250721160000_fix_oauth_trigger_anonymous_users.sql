-- Migration: Fix OAuth phone extraction trigger for anonymous users
-- The trigger was failing when trying to process anonymous users without metadata

-- Updated function to safely handle anonymous users and null metadata
CREATE OR REPLACE FUNCTION extract_oauth_phone_to_auth_users()
RETURNS TRIGGER AS $$
DECLARE
  extracted_phone text;
  provider text;
BEGIN
  -- Safely get the OAuth provider (handle null raw_app_meta_data)
  provider := COALESCE(NEW.raw_app_meta_data->>'provider', NULL);
  
  -- Only extract phone from Google OAuth (not Facebook)
  IF provider = 'google' THEN
    -- Safely extract phone from Google OAuth metadata
    extracted_phone := COALESCE(
      NEW.raw_user_meta_data->>'phone',           -- Google OAuth phone
      NEW.raw_user_meta_data->>'phone_number'     -- Alternative Google format
    );

    -- Only update if we found a phone number and it's not already set
    IF extracted_phone IS NOT NULL AND extracted_phone != '' AND NEW.phone IS NULL THEN
      -- Update the phone field in the same record
      NEW.phone := extracted_phone;
      
      -- Log the extraction for debugging
      RAISE NOTICE 'Google OAuth phone extracted for user %: %', NEW.id, extracted_phone;
    END IF;
  ELSIF provider = 'facebook' THEN
    -- Log that Facebook user will need to provide phone later
    RAISE NOTICE 'Facebook OAuth user % - phone will be collected later', NEW.id;
  ELSIF provider IS NULL THEN
    -- Handle manual signup or anonymous users
    -- Only process if user_metadata exists and is not null
    IF NEW.user_metadata IS NOT NULL AND NEW.phone IS NULL THEN
      BEGIN
        extracted_phone := COALESCE(
          NEW.user_metadata->>'phone',                -- Manual signup phone
          NEW.user_metadata->>'phone_number'          -- Alternative format
        );
        
        IF extracted_phone IS NOT NULL AND extracted_phone != '' THEN
          NEW.phone := extracted_phone;
          RAISE NOTICE 'Manual signup phone extracted for user %: %', NEW.id, extracted_phone;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- Log error but don't fail the entire user creation
          RAISE NOTICE 'Could not extract phone from user_metadata for user %: %', NEW.id, SQLERRM;
      END;
    END IF;
    
    -- Log anonymous user creation (for debugging)
    IF NEW.is_anonymous = true THEN
      RAISE NOTICE 'Anonymous user created: %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment update
COMMENT ON FUNCTION extract_oauth_phone_to_auth_users() IS 
'Extracts phone numbers from OAuth provider metadata (Google only) and manual signups. Safely handles anonymous users and null metadata.';