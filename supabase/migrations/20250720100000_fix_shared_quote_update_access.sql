-- Migration: Fix Shared Quote UPDATE Access for Ownership Transfer
-- This allows authenticated users to update quotes accessed via share_token for ownership transfer

-- Update the quotes UPDATE policy to allow share_token access
DROP POLICY IF EXISTS "Users can update their own quotes" ON "public"."quotes";

CREATE POLICY "Users can update their own quotes" ON "public"."quotes"
FOR UPDATE USING (
    -- Users can update their own quotes (including anonymous users)
    auth.uid() = user_id
    OR
    -- Admins can update all quotes
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Allow authenticated users to update quotes accessed via valid share token
    -- (for ownership transfer during quote approval)
    (
        auth.role() = 'authenticated'
        AND share_token IS NOT NULL 
        AND share_token != ''
        AND (expires_at IS NULL OR expires_at > NOW())
    )
) WITH CHECK (
    -- Ensure user_id doesn't change during update, unless:
    -- 1. It's the quote owner making the change, OR
    -- 2. It's an admin, OR  
    -- 3. It's an ownership transfer via share_token (authenticated user claiming the quote)
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    (
        -- Allow ownership transfer via share_token
        auth.role() = 'authenticated'
        AND share_token IS NOT NULL 
        AND share_token != ''
        AND (expires_at IS NULL OR expires_at > NOW())
        -- The new user_id should be the authenticated user claiming the quote
        AND user_id = auth.uid()
    )
);

-- Add helpful comment
COMMENT ON POLICY "Users can update their own quotes" ON "public"."quotes" IS 'Allows users to update their own quotes, admins to update any quote, and authenticated users to claim quotes via valid share tokens';