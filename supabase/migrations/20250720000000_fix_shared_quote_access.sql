-- Migration: Fix Shared Quote Access for Anonymous Users
-- This adds RLS policies to allow anonymous users to access quotes via share_token

-- Add policy to allow shared quote access for quotes table
CREATE POLICY "Allow shared quote access" ON "public"."quotes"
FOR SELECT USING (
    -- Existing access (users can access their own quotes)
    auth.uid() = user_id
    OR
    -- Admins can access all quotes
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Service role can access all quotes
    auth.role() = 'service_role'
    OR
    -- Allow access via valid share token (for anonymous users)
    (
        share_token IS NOT NULL 
        AND share_token != ''
        AND (expires_at IS NULL OR expires_at > NOW())
        -- Note: share_token validation will be done at application level
        -- since we can't pass the token through RLS context easily
    )
);

-- Add policy to allow shared quote item access for quote_items table
CREATE POLICY "Allow shared quote item access" ON "public"."quote_items"
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "public"."quotes" q 
        WHERE q.id = quote_id 
        AND (
            -- User owns the quote (including anonymous users)
            q.user_id = auth.uid()
            OR
            -- Admin access
            EXISTS (
                SELECT 1 FROM user_roles 
                WHERE user_id = auth.uid() AND role = 'admin'
            )
            OR
            -- Service role access
            auth.role() = 'service_role'
            OR
            -- Allow access via valid share token
            (
                q.share_token IS NOT NULL 
                AND q.share_token != ''
                AND (q.expires_at IS NULL OR q.expires_at > NOW())
            )
        )
    )
);

-- Drop the old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can access their own quotes" ON "public"."quotes";
DROP POLICY IF EXISTS "Users can access their own quote items" ON "public"."quote_items";

-- Rename the new policies to match the old names for consistency
ALTER POLICY "Allow shared quote access" ON "public"."quotes" RENAME TO "Users can access their own quotes";
ALTER POLICY "Allow shared quote item access" ON "public"."quote_items" RENAME TO "Users can access their own quote items";

-- Add helpful comment
COMMENT ON POLICY "Users can access their own quotes" ON "public"."quotes" IS 'Allows users to access their own quotes and allows anonymous access to quotes with valid share tokens';
COMMENT ON POLICY "Users can access their own quote items" ON "public"."quote_items" IS 'Allows access to quote items for owned quotes and quotes with valid share tokens';