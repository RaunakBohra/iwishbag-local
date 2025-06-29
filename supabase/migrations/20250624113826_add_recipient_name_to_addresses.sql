-- Add recipient name to user addresses
ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS recipient_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_addresses.recipient_name IS 'Full name of the person who should receive the package at this address';
