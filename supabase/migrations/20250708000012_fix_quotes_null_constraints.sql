-- Fix quotes table to allow NULL user_id for admin-created and anonymous quotes
-- This migration ensures admins can create quotes without linking to user profiles

-- First, drop the NOT NULL constraint on user_id
ALTER TABLE quotes ALTER COLUMN user_id DROP NOT NULL;

-- Also drop NOT NULL constraint on email (for truly anonymous quotes)
ALTER TABLE quotes ALTER COLUMN email DROP NOT NULL;

-- Drop any existing check constraint
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_user_id_check;

-- Add a new, more flexible constraint
ALTER TABLE quotes ADD CONSTRAINT quotes_user_id_email_check 
CHECK (
  -- Anonymous quotes: no user_id, optional email
  (is_anonymous = true AND user_id IS NULL) OR 
  -- Non-anonymous quotes: must have either user_id OR email
  (is_anonymous = false AND (user_id IS NOT NULL OR email IS NOT NULL))
);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT quotes_user_id_email_check ON quotes IS 
'Anonymous quotes must have user_id = NULL. Non-anonymous quotes must have either user_id or email.';

-- Update column comments
COMMENT ON COLUMN quotes.user_id IS 'User ID for registered users. NULL for anonymous/admin-created quotes.';
COMMENT ON COLUMN quotes.email IS 'Email address. Optional for anonymous quotes, required for non-anonymous quotes without user_id.';
COMMENT ON COLUMN quotes.is_anonymous IS 'True for quotes without user association (guest/admin-created).';