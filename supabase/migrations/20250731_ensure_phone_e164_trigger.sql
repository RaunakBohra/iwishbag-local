-- Create a trigger to ensure all phone numbers are stored in E.164 format with + prefix

-- Function to ensure phone has + prefix
CREATE OR REPLACE FUNCTION ensure_phone_e164_format()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if phone is being set
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    -- Remove all spaces from phone
    NEW.phone := REPLACE(NEW.phone, ' ', '');
    
    -- If phone doesn't start with +, try to add it intelligently
    IF NOT NEW.phone LIKE '+%' THEN
      -- Log warning for monitoring
      RAISE WARNING 'Phone number % for user % does not start with +, attempting to fix', NEW.phone, NEW.email;
      
      -- Try to detect country and add + prefix
      IF LENGTH(NEW.phone) >= 10 THEN
        NEW.phone := '+' || NEW.phone;
      END IF;
    END IF;
    
    -- Final validation - ensure it starts with +
    IF NOT NEW.phone LIKE '+%' THEN
      RAISE EXCEPTION 'Phone number must be in E.164 format with + prefix. Got: %', NEW.phone;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS ensure_phone_e164_trigger ON auth.users;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER ensure_phone_e164_trigger
BEFORE INSERT OR UPDATE OF phone ON auth.users
FOR EACH ROW
EXECUTE FUNCTION ensure_phone_e164_format();

-- Test the trigger works
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get a user with phone that has + prefix
  SELECT id INTO test_user_id FROM auth.users WHERE phone LIKE '+%' LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- This should succeed (already has +)
    UPDATE auth.users SET phone = phone WHERE id = test_user_id;
    RAISE NOTICE 'Trigger test passed for phones with + prefix';
  END IF;
END $$;