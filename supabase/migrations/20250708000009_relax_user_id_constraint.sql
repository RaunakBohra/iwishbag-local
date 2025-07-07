-- Temporarily relax the user_id constraint to allow guest approval transition
-- This allows is_anonymous = false with user_id = null during guest approval
-- The user_id will be set when temp account is created

DROP CONSTRAINT IF EXISTS quotes_user_id_check ON quotes;

-- Create a more flexible constraint that allows:
-- 1. Anonymous quotes with user_id = null
-- 2. Non-anonymous quotes with user_id = null (guest approval state)
-- 3. Non-anonymous quotes with user_id not null (full accounts)
ALTER TABLE quotes ADD CONSTRAINT quotes_user_id_check 
CHECK (
  -- Anonymous quotes must have user_id = null
  (is_anonymous = true AND user_id IS NULL) OR 
  -- Non-anonymous quotes can have user_id null or not null
  (is_anonymous = false)
);

-- Update comment
COMMENT ON CONSTRAINT quotes_user_id_check ON quotes IS 
'Anonymous quotes require user_id = NULL. Non-anonymous quotes can have user_id NULL (guest) or NOT NULL (registered user).';