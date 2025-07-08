-- Consolidated migration for anonymous quotes support
-- This migration combines all necessary changes for guest quotes and admin-created quotes

-- 1. Ensure user_id can be NULL for anonymous quotes
ALTER TABLE quotes ALTER COLUMN user_id DROP NOT NULL;

-- 2. Ensure email can be NULL for truly anonymous quotes  
ALTER TABLE quotes ALTER COLUMN email DROP NOT NULL;

-- 3. Drop any existing constraints
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_user_id_check;
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_user_id_email_check;

-- 4. Add a flexible constraint for user_id and email
ALTER TABLE quotes ADD CONSTRAINT quotes_anonymous_check 
CHECK (
  -- Anonymous quotes: no user_id required
  (is_anonymous = true AND user_id IS NULL) OR 
  -- Non-anonymous quotes: must have user_id
  (is_anonymous = false AND user_id IS NOT NULL)
);

-- 5. RLS Policies for shared quotes
-- Drop any conflicting policies first
DROP POLICY IF EXISTS "View shared quotes with restrictions" ON public.quotes;
DROP POLICY IF EXISTS "Anyone can view shared quotes" ON public.quotes;
DROP POLICY IF EXISTS "Temporary permissive shared quotes policy" ON public.quotes;
DROP POLICY IF EXISTS "View shared quotes by token" ON public.quotes;
DROP POLICY IF EXISTS "Allow status updates on shared quotes" ON public.quotes;

-- Create comprehensive RLS policies
-- Policy for viewing shared quotes
CREATE POLICY "Anyone can view shared quotes" ON public.quotes
  FOR SELECT 
  USING (
    share_token IS NOT NULL 
    AND (expires_at IS NULL OR expires_at > now())
  );

-- Policy for updating shared quotes (for approval/rejection)
CREATE POLICY "Allow status updates on shared quotes" ON public.quotes
  FOR UPDATE 
  USING (
    share_token IS NOT NULL 
    AND (expires_at IS NULL OR expires_at > now())
  )
  WITH CHECK (
    share_token IS NOT NULL
  );

-- Policy for quote items of shared quotes
DROP POLICY IF EXISTS "Anyone can view quote items for shared quotes" ON public.quote_items;

CREATE POLICY "Anyone can view quote items for shared quotes" ON public.quote_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_items.quote_id
      AND q.share_token IS NOT NULL
      AND (q.expires_at IS NULL OR q.expires_at > now())
    )
  );

-- Add comments
COMMENT ON COLUMN quotes.user_id IS 'User ID for registered users. NULL for anonymous/admin-created quotes.';
COMMENT ON COLUMN quotes.email IS 'Email address. Optional for anonymous quotes.';
COMMENT ON COLUMN quotes.is_anonymous IS 'True for quotes without user association (guest/admin-created).';
COMMENT ON CONSTRAINT quotes_anonymous_check ON quotes IS 'Anonymous quotes must have user_id = NULL. Non-anonymous quotes must have user_id.';