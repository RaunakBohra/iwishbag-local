-- Fix user_id constraint for anonymous quotes
-- Allow user_id to be NULL for anonymous quotes

-- First, drop the NOT NULL constraint
ALTER TABLE quotes ALTER COLUMN user_id DROP NOT NULL;

-- Add a check constraint to ensure user_id is not null for non-anonymous quotes
ALTER TABLE quotes ADD CONSTRAINT quotes_user_id_check 
CHECK (
  (is_anonymous = true AND user_id IS NULL) OR 
  (is_anonymous = false AND user_id IS NOT NULL)
);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT quotes_user_id_check ON quotes IS 
'For anonymous quotes, user_id can be NULL. For regular quotes, user_id must be provided.'; 