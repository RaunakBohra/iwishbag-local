-- Allow anonymous users to update quotes for shared quotes they have access to
-- This enables the guest approval flow to work properly

CREATE POLICY "Anyone can update shared quotes" ON public.quotes
  FOR UPDATE USING (
    is_anonymous = true 
    AND share_token IS NOT NULL 
    AND (expires_at IS NULL OR expires_at > now())
  );