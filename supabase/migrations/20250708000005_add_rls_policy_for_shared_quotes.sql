-- Create RLS policy to allow updates to shared quotes
-- This policy allows anyone to update quotes that:
-- 1. Are marked as anonymous (is_anonymous = true)
-- 2. Have a share_token (not null)
-- 3. Are not expired (expires_at is null or in the future)

CREATE POLICY "Allow updates to valid shared quotes" ON public.quotes
  FOR UPDATE 
  USING (
    is_anonymous = true 
    AND share_token IS NOT NULL 
    AND (expires_at IS NULL OR expires_at > now())
  );