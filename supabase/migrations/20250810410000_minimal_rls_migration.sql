-- ============================================================================
-- MINIMAL RLS MIGRATION - Admin-only access for sensitive tables
-- Simple approach: admin access only for most tables, public read for some
-- ============================================================================

-- PROFILES TABLE - Users can see their own profiles, admins can see all
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        DROP POLICY IF EXISTS "profiles_policy" ON public.profiles;
        
        CREATE POLICY "profiles_policy" ON public.profiles FOR ALL TO public 
            USING (auth.uid() = id OR is_admin()) 
            WITH CHECK (auth.uid() = id OR is_admin());
            
        RAISE NOTICE 'Created profiles policy';
    END IF;
END $$;

-- USER_ROLES TABLE - Users can see their own roles, admins manage all
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
        DROP POLICY IF EXISTS "user_roles_policy" ON public.user_roles;
        
        CREATE POLICY "user_roles_policy" ON public.user_roles FOR ALL TO public 
            USING (
                (
                    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_roles' AND column_name = 'user_id')
                    AND (auth.uid() = user_id OR is_admin())
                ) OR is_admin()
            ) 
            WITH CHECK (is_admin());
            
        RAISE NOTICE 'Created user_roles policy';
    END IF;
END $$;

-- QUOTES_V2 TABLE - Admin access and customer access
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes_v2') THEN
        DROP POLICY IF EXISTS "quotes_v2_policy" ON public.quotes_v2;
        
        CREATE POLICY "quotes_v2_policy" ON public.quotes_v2 FOR ALL TO authenticated 
            USING (
                is_admin() OR 
                (
                    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_v2' AND column_name = 'customer_id')
                    AND customer_id = auth.uid()
                )
            ) 
            WITH CHECK (
                is_admin() OR 
                (
                    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes_v2' AND column_name = 'customer_id')
                    AND customer_id = auth.uid()
                )
            );
            
        RAISE NOTICE 'Created quotes_v2 policy';
    END IF;
END $$;

-- ORDERS TABLE - Admin only for now (until we figure out the correct customer column)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        DROP POLICY IF EXISTS "orders_policy" ON public.orders;
        
        CREATE POLICY "orders_policy" ON public.orders FOR ALL TO authenticated 
            USING (is_admin()) 
            WITH CHECK (is_admin());
            
        RAISE NOTICE 'Created orders admin-only policy';
    END IF;
END $$;

-- PAYMENT TABLES - Admin only (highly sensitive)
DO $$
DECLARE
    payment_tables text[] := ARRAY['payment_transactions', 'payment_adjustments'];
    tbl_name text;
BEGIN
    FOREACH tbl_name IN ARRAY payment_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
            EXECUTE format('DROP POLICY IF EXISTS "%s_policy" ON public.%I', tbl_name, tbl_name);
            EXECUTE format('CREATE POLICY "%s_policy" ON public.%I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())', tbl_name, tbl_name);
            RAISE NOTICE 'Created % admin-only policy', tbl_name;
        END IF;
    END LOOP;
END $$;

-- MESSAGES TABLE - Admin only for now
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        DROP POLICY IF EXISTS "messages_policy" ON public.messages;
        
        CREATE POLICY "messages_policy" ON public.messages FOR ALL TO public 
            USING (is_admin()) 
            WITH CHECK (is_admin());
            
        RAISE NOTICE 'Created messages admin-only policy';
    END IF;
END $$;

-- SUPPORT_SYSTEM TABLE - Admin only for now  
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_system') THEN
        DROP POLICY IF EXISTS "support_system_policy" ON public.support_system;
        
        CREATE POLICY "support_system_policy" ON public.support_system FOR ALL TO public 
            USING (is_admin()) 
            WITH CHECK (is_admin());
            
        RAISE NOTICE 'Created support_system admin-only policy';
    END IF;
END $$;

-- DISCOUNT_CODES TABLE - Admin management, public read
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'discount_codes') THEN
        DROP POLICY IF EXISTS "discount_codes_admin" ON public.discount_codes;
        DROP POLICY IF EXISTS "discount_codes_read" ON public.discount_codes;
        
        CREATE POLICY "discount_codes_admin" ON public.discount_codes FOR ALL TO public 
            USING (is_admin()) 
            WITH CHECK (is_admin());
            
        CREATE POLICY "discount_codes_read" ON public.discount_codes FOR SELECT TO public 
            USING (true);
            
        RAISE NOTICE 'Created discount_codes policies';
    END IF;
END $$;