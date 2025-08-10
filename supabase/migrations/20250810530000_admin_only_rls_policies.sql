-- ============================================================================
-- ADMIN-ONLY RLS POLICIES FOR CLOUD DATABASE
-- Simplest approach: admin access for all sensitive tables
-- ============================================================================

-- Clear existing policies
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                     rec.policyname, rec.schemaname, rec.tablename);
    END LOOP;
END $$;

-- ENABLE RLS ON ALL IMPORTANT TABLES AND CREATE ADMIN-ONLY POLICIES
DO $$ 
DECLARE
    protected_tables text[] := ARRAY[
        'profiles',
        'user_roles',
        'quotes_v2', 
        'orders',
        'order_items',
        'payment_transactions',
        'payment_adjustments',
        'gateway_refunds',
        'refund_items',
        'messages',
        'support_system',
        'delivery_addresses',
        'customer_preferences',
        'consolidation_groups',
        'email_messages',
        'sms_messages',
        'webhook_logs',
        'paypal_webhook_events',
        'quote_documents',
        'order_shipments',
        'order_status_history',
        'item_revisions',
        'discount_settings',
        'payment_health_logs',
        'payment_verification_logs'
    ];
    tbl_name text;
BEGIN
    FOREACH tbl_name IN ARRAY protected_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name AND table_schema = 'public') THEN
            -- Enable RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
            
            -- Create admin-only policy
            EXECUTE format('CREATE POLICY "%s_admin_only" ON public.%I FOR ALL USING (is_admin()) WITH CHECK (is_admin())', tbl_name, tbl_name);
            
            -- Add service role policy for system operations
            EXECUTE format('CREATE POLICY "%s_service_role" ON public.%I TO service_role USING (true) WITH CHECK (true)', tbl_name, tbl_name);
            
            RAISE NOTICE 'Protected table: %', tbl_name;
        END IF;
    END LOOP;
END $$;

-- SPECIAL CASES

-- PROFILES: Users can see their own profile
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "profiles_admin_only" ON public.profiles;
        DROP POLICY IF EXISTS "profiles_service_role" ON public.profiles;
        
        CREATE POLICY "profiles_admin_or_own" ON public.profiles FOR ALL 
            USING ((auth.uid() = id) OR is_admin()) 
            WITH CHECK ((auth.uid() = id) OR is_admin());
            
        CREATE POLICY "profiles_service_role" ON public.profiles TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- DISCOUNT_CODES: Public can read, admin can manage
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discount_codes' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "discount_codes_admin_only" ON public.discount_codes;
        DROP POLICY IF EXISTS "discount_codes_service_role" ON public.discount_codes;
        
        CREATE POLICY "discount_codes_admin_manage" ON public.discount_codes FOR ALL
            USING (is_admin()) 
            WITH CHECK (is_admin());
            
        CREATE POLICY "discount_codes_public_read" ON public.discount_codes FOR SELECT
            USING (true);
            
        CREATE POLICY "discount_codes_service_role" ON public.discount_codes TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- KEEP THESE TABLES COMPLETELY PUBLIC (NO RLS)
ALTER TABLE IF EXISTS public.country_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.system_settings DISABLE ROW LEVEL SECURITY; 
ALTER TABLE IF EXISTS public.shipping_routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_gateways DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.addon_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.continental_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.country_pricing_overrides DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.regional_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pricing_calculation_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.country_configs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.country_payment_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_classifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.markets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.market_countries DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.membership_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.discount_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_method_discounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paypal_refund_reasons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rejection_reasons DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pickup_time_slots DISABLE ROW LEVEL SECURITY;