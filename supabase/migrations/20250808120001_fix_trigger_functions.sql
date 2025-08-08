-- Fix trigger functions to reference delivery_addresses instead of user_addresses

CREATE OR REPLACE FUNCTION handle_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If this is the first address for the user, make it default
  IF TG_OP = 'INSERT' THEN
    -- Check if user has any other addresses
    IF NOT EXISTS (
      SELECT 1 FROM delivery_addresses 
      WHERE user_id = NEW.user_id AND id != NEW.id
    ) THEN
      NEW.is_default = TRUE;
    END IF;
  END IF;

  -- If setting as default, unset others
  IF NEW.is_default = TRUE THEN
    UPDATE delivery_addresses 
    SET is_default = FALSE 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_default_address(p_user_id UUID)
RETURNS delivery_addresses
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  result delivery_addresses;
BEGIN
  SELECT * INTO result
  FROM delivery_addresses
  WHERE user_id = p_user_id 
  AND is_default = TRUE
  LIMIT 1;

  RETURN result;
END;
$$;