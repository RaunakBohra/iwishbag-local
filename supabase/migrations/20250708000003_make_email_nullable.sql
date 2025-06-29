-- Make email nullable for anonymous quotes
ALTER TABLE quotes ALTER COLUMN email DROP NOT NULL;

-- Add a check constraint: email required for non-anonymous, optional for anonymous
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_email_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_email_check
CHECK (
  (is_anonymous = true AND (email IS NULL OR email = ''))
  OR
  (is_anonymous = false AND email IS NOT NULL AND email <> '')
);

-- Add a comment for clarity
COMMENT ON CONSTRAINT quotes_email_check ON quotes IS 'Email is required for non-anonymous quotes, optional for anonymous.'; 