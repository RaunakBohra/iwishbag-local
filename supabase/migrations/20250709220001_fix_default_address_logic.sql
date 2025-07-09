-- Fix default address logic to prevent conflicts
-- This ensures only one address per user can be default at a time

-- Function to handle default address logic
CREATE OR REPLACE FUNCTION public.handle_default_address()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated address is being set as default
  IF NEW.is_default = TRUE THEN
    -- Set all other addresses for this user to not default
    UPDATE public.user_addresses 
    SET is_default = FALSE 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for handling default address on insert
DROP TRIGGER IF EXISTS trigger_handle_default_address_insert ON public.user_addresses;
CREATE TRIGGER trigger_handle_default_address_insert
  BEFORE INSERT ON public.user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_default_address();

-- Create trigger for handling default address on update
DROP TRIGGER IF EXISTS trigger_handle_default_address_update ON public.user_addresses;
CREATE TRIGGER trigger_handle_default_address_update
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_default_address();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_default_address() TO authenticated, anon;