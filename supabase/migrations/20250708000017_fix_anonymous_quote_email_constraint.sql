-- Fix the email constraint to allow emails for anonymous quotes created by admin
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_email_check;

-- New constraint: email is always allowed, but required for non-anonymous quotes
ALTER TABLE quotes ADD CONSTRAINT quotes_email_check
CHECK (
  -- Non-anonymous quotes must have email
  (is_anonymous = false AND email IS NOT NULL AND email <> '')
  OR
  -- Anonymous quotes can have email or not (for admin-created quotes)
  (is_anonymous = true)
);

-- Add a comment for clarity
COMMENT ON CONSTRAINT quotes_email_check ON quotes IS 'Email is required for non-anonymous quotes, optional for anonymous quotes.';