-- Add phone number to user addresses
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_addresses.phone IS 'Phone number for this specific address';
