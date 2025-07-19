-- Temporarily Disable Country Constraints for Testing
-- This allows testing while we fix the frontend to send proper ISO codes

-- Temporarily drop the foreign key constraint
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_country_code_fkey;

-- Temporarily drop the profiles country check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_country;

-- Add comments explaining this is temporary
COMMENT ON TABLE quotes IS 'TEMPORARY: Country constraints disabled for frontend fixes';
COMMENT ON TABLE profiles IS 'TEMPORARY: Country constraints disabled for frontend fixes';