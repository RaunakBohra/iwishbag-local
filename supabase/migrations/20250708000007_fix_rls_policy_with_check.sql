-- Fix RLS policy to handle both USING and WITH CHECK clauses
DROP POLICY IF EXISTS "Allow guest approval of shared quotes" ON public.quotes;

-- Create comprehensive RLS policy for shared quotes
CREATE POLICY "Allow guest approval of shared quotes" ON public.quotes
  FOR UPDATE 
  USING (
    -- Current row must have share token, not be expired, and be anonymous
    share_token IS NOT NULL 
    AND (expires_at IS NULL OR expires_at > now())
    AND is_anonymous = true
  )
  WITH CHECK (
    -- After update: allow transition to non-anonymous with email, or stay anonymous
    share_token IS NOT NULL 
    AND (expires_at IS NULL OR expires_at > now())
    AND (
      -- Allow staying anonymous
      (is_anonymous = true AND (email IS NULL OR email = ''))
      OR 
      -- Allow transition to non-anonymous with email
      (is_anonymous = false AND email IS NOT NULL AND email <> '')
    )
  );