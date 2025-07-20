-- Migration: Fix Anonymous Check Constraint for New Anonymous Auth System
-- The old constraint assumed anonymous quotes have user_id = NULL
-- The new system uses Supabase anonymous auth, which provides a user_id

-- Drop the old constraint that conflicts with anonymous auth
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_anonymous_check;

-- Add new constraint that works with anonymous authentication
-- Anonymous users can have user_id (from Supabase anonymous auth) but should have is_anonymous = true
-- Regular users should have user_id and is_anonymous = false
ALTER TABLE quotes ADD CONSTRAINT quotes_anonymous_check CHECK (
    -- Anonymous quotes: is_anonymous = true (user_id can be NULL or not NULL for anonymous sessions)
    is_anonymous = true
    OR
    -- Regular user quotes: is_anonymous = false AND user_id must not be NULL
    (is_anonymous = false AND user_id IS NOT NULL)
);

-- Add helpful comment
COMMENT ON CONSTRAINT quotes_anonymous_check ON quotes IS 'Ensures proper anonymous flag usage: anonymous quotes have is_anonymous=true, regular user quotes have is_anonymous=false with user_id';