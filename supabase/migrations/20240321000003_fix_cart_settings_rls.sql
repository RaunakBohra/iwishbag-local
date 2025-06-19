-- Fix cart_settings RLS policy to use has_role function instead of auth.role()
-- This aligns with the working pattern used in other admin tables

DO $$
BEGIN
    -- Drop the existing policy
    DROP POLICY IF EXISTS "Enable write access for admins only" ON public.cart_settings;
    
    -- Create the new policy using has_role function
    CREATE POLICY "Enable write access for admins only" ON public.cart_settings
        FOR ALL
        USING (has_role(auth.uid(), 'admin'::app_role));
        
END $$; 