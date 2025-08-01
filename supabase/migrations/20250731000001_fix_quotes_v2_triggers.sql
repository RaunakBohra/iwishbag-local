-- Fix trigger conflicts for quotes_v2
-- Drop existing trigger if it exists and recreate

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS set_quote_expiry ON quotes_v2;

-- Recreate the trigger
CREATE TRIGGER set_quote_expiry
  BEFORE INSERT OR UPDATE ON quotes_v2
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_expiry();