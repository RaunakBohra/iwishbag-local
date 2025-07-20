-- Fix guest quote submissions by allowing anonymous users to insert quotes
-- This addresses the RLS policy blocking guest quotes

-- Add policy to allow guest quote insertion
CREATE POLICY "Allow guest quote submissions" ON "public"."quotes" 
FOR INSERT 
WITH CHECK (
  -- Allow if user is authenticated and owns the quote
  ("auth"."uid"() = "user_id") 
  OR 
  -- Allow if it's a guest submission (no user_id and no auth)
  ("user_id" IS NULL AND "auth"."uid"() IS NULL)
);

-- Also allow guest quote items to be inserted
CREATE POLICY "Allow guest quote items" ON "public"."quote_items" 
FOR INSERT 
WITH CHECK (
  -- Allow if the quote belongs to the user or is a guest quote
  EXISTS (
    SELECT 1 FROM "public"."quotes" q 
    WHERE q.id = quote_id 
    AND (
      q.user_id = "auth"."uid"() 
      OR 
      (q.user_id IS NULL AND "auth"."uid"() IS NULL)
    )
  )
);

-- Allow guest quotes to be viewed by their creators (anonymous users)
-- This is needed for the success page and any quote tracking
CREATE POLICY "Allow guest quote viewing" ON "public"."quotes" 
FOR SELECT 
USING (
  -- Allow if user owns the quote
  "auth"."uid"() = "user_id"
  OR
  -- Allow admins to view all quotes
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  -- Allow service role access
  auth.role() = 'service_role'
);

-- Allow guest quote items to be viewed
CREATE POLICY "Allow guest quote item viewing" ON "public"."quote_items" 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM "public"."quotes" q 
    WHERE q.id = quote_id 
    AND (
      -- User owns the quote
      q.user_id = "auth"."uid"() 
      OR 
      -- Admin access
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
      )
      OR
      -- Service role access
      auth.role() = 'service_role'
    )
  )
);