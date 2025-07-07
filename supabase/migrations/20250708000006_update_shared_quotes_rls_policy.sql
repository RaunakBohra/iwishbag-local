-- Drop the existing policy and create a new one that handles guest approval
DROP POLICY IF EXISTS "Allow updates to valid shared quotes" ON public.quotes;

-- Create updated RLS policy for shared quotes
-- USING clause checks the CURRENT state before update
CREATE POLICY "Allow guest approval of shared quotes" ON public.quotes
  FOR UPDATE 
  USING (
    -- Must have share token and not be expired
    share_token IS NOT NULL 
    AND (expires_at IS NULL OR expires_at > now())
    -- Must currently be anonymous (before the update)
    AND is_anonymous = true
  );