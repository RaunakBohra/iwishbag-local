-- Migration: Replace Custom Guest System with Supabase Anonymous Auth
-- This removes custom guest handling and updates RLS policies for anonymous authentication

-- Step 1: Remove custom guest RLS policies
DROP POLICY IF EXISTS "Allow guest quote submissions" ON "public"."quotes";
DROP POLICY IF EXISTS "Allow guest quote items" ON "public"."quote_items";
DROP POLICY IF EXISTS "Allow guest quote viewing" ON "public"."quotes";
DROP POLICY IF EXISTS "Allow guest quote item viewing" ON "public"."quote_items";

-- Step 2: Update quotes table RLS policies for anonymous auth
-- Remove any existing policies that block anonymous users
DROP POLICY IF EXISTS "Users can insert their own quotes" ON "public"."quotes";
DROP POLICY IF EXISTS "Users can only access own quotes" ON "public"."quotes";
DROP POLICY IF EXISTS "Users can access their own quotes" ON "public"."quotes";
DROP POLICY IF EXISTS "Users can update their own quotes" ON "public"."quotes";

-- Create new anonymous-auth compatible policies for quotes
CREATE POLICY "Users can insert their own quotes" ON "public"."quotes"
FOR INSERT WITH CHECK (
    -- Both authenticated and anonymous users can insert their own quotes
    auth.uid() = user_id
);

CREATE POLICY "Users can access their own quotes" ON "public"."quotes"
FOR SELECT USING (
    -- Users can access their own quotes (including anonymous users)
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
);

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
) WITH CHECK (
    -- Ensure user_id doesn't change during update
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Step 3: Update quote_items table RLS policies for anonymous auth
DROP POLICY IF EXISTS "Users can insert their own quote items" ON "public"."quote_items";
DROP POLICY IF EXISTS "Users can only access own quote items" ON "public"."quote_items";
DROP POLICY IF EXISTS "Users can access their own quote items" ON "public"."quote_items";
DROP POLICY IF EXISTS "Users can update their own quote items" ON "public"."quote_items";

CREATE POLICY "Users can insert their own quote items" ON "public"."quote_items"
FOR INSERT WITH CHECK (
    -- Allow if the quote belongs to the user (including anonymous users)
    EXISTS (
        SELECT 1 FROM "public"."quotes" q 
        WHERE q.id = quote_id 
        AND q.user_id = auth.uid()
    )
);

CREATE POLICY "Users can access their own quote items" ON "public"."quote_items"
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
        )
    )
);

CREATE POLICY "Users can update their own quote items" ON "public"."quote_items"
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM "public"."quotes" q 
        WHERE q.id = quote_id 
        AND (
            q.user_id = auth.uid()
            OR
            EXISTS (
                SELECT 1 FROM user_roles 
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        )
    )
);

-- Step 4: Ensure anonymous users are properly handled in other tables
-- Update user_addresses policies to work with anonymous auth (though anonymous users won't use addresses)
DROP POLICY IF EXISTS "Users can only access own addresses" ON "public"."user_addresses";
DROP POLICY IF EXISTS "Users can access their own addresses" ON "public"."user_addresses";
CREATE POLICY "Users can access their own addresses" ON "public"."user_addresses"
FOR ALL USING (
    -- Only authenticated (non-anonymous) users can have addresses
    auth.uid() = user_id
    AND auth.jwt() ->> 'aud' = 'authenticated'
    OR
    -- Admin access
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Service role access
    auth.role() = 'service_role'
);

-- Step 5: Update payment_transactions for anonymous users
DROP POLICY IF EXISTS "Users can access their own transactions" ON "public"."payment_transactions";
DROP POLICY IF EXISTS "Users can access transactions" ON "public"."payment_transactions";
CREATE POLICY "Users can access their own transactions" ON "public"."payment_transactions"
FOR SELECT USING (
    -- Users can access transactions for their quotes (including anonymous users)
    EXISTS (
        SELECT 1 FROM "public"."quotes" q 
        WHERE q.id = quote_id 
        AND q.user_id = auth.uid()
    )
    OR
    -- Admin access
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR
    -- Service role access
    auth.role() = 'service_role'
);

-- Step 6: Add helpful comment about anonymous auth
COMMENT ON TABLE quotes IS 'All quotes now use proper authentication (anonymous or authenticated). No more user_id IS NULL for guest users.';

-- Step 7: Create function to check if user is anonymous
CREATE OR REPLACE FUNCTION is_anonymous_user()
RETURNS boolean AS $$
BEGIN
    -- Check if user is anonymous (has auth.uid() but not in profiles table)
    RETURN (
        auth.uid() IS NOT NULL 
        AND NOT EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_anonymous_user() TO anon, authenticated;