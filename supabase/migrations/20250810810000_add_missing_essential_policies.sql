-- ============================================================================
-- ADD MISSING ESSENTIAL POLICIES
-- Address gaps found in verification for critical tables
-- ============================================================================

-- USER ADDRESSES POLICIES (Critical - users must access their addresses)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_addresses' AND table_schema = 'public') THEN
        CREATE POLICY "user_addresses_admin_all" ON public.user_addresses FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'user_id' AND table_schema = 'public') THEN
            CREATE POLICY "user_addresses_users_own" ON public.user_addresses FOR ALL 
                USING ((auth.uid() = user_id OR is_admin())) 
                WITH CHECK ((auth.uid() = user_id OR is_admin()));
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_addresses' AND column_name = 'customer_id' AND table_schema = 'public') THEN
            CREATE POLICY "user_addresses_customers_own" ON public.user_addresses FOR ALL 
                USING ((auth.uid() = customer_id OR is_admin())) 
                WITH CHECK ((auth.uid() = customer_id OR is_admin()));
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- COUNTRY SETTINGS POLICIES (Critical - public needs access for currency/shipping)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'country_settings' AND table_schema = 'public') THEN
        CREATE POLICY "country_settings_admin_manage" ON public.country_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        CREATE POLICY "country_settings_public_read" ON public.country_settings FOR SELECT USING (true);
        CREATE POLICY "country_settings_auth_read" ON public.country_settings FOR SELECT TO authenticated USING (true);
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'country_settings' AND column_name = 'is_active' AND table_schema = 'public') THEN
            CREATE POLICY "country_settings_public_active" ON public.country_settings FOR SELECT 
                USING ((is_active = true OR is_admin()));
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CURRENCY RATES POLICIES (Critical - needed for quote calculations)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'currency_rates' AND table_schema = 'public') THEN
        CREATE POLICY "currency_rates_admin_manage" ON public.currency_rates FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        CREATE POLICY "currency_rates_public_read" ON public.currency_rates FOR SELECT USING (true);
        CREATE POLICY "currency_rates_auth_read" ON public.currency_rates FOR SELECT TO authenticated USING (true);
        
        -- Service role needs to update rates
        CREATE POLICY "currency_rates_service_update" ON public.currency_rates FOR ALL 
            USING (((auth.jwt() ->> 'role') = 'service_role' OR is_admin()))
            WITH CHECK (((auth.jwt() ->> 'role') = 'service_role' OR is_admin()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- HSN MASTER POLICIES (Critical - needed for tax calculations)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hsn_master' AND table_schema = 'public') THEN
        CREATE POLICY "hsn_master_admin_manage" ON public.hsn_master FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        CREATE POLICY "hsn_master_auth_read" ON public.hsn_master FOR SELECT TO authenticated USING (true);
        CREATE POLICY "hsn_master_public_read" ON public.hsn_master FOR SELECT USING (true);
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hsn_master' AND column_name = 'is_active' AND table_schema = 'public') THEN
            CREATE POLICY "hsn_master_public_active" ON public.hsn_master FOR SELECT 
                USING ((is_active = true OR is_admin()));
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ADMIN OVERRIDES POLICIES (Critical - admin configuration system)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_overrides' AND table_schema = 'public') THEN
        CREATE POLICY "admin_overrides_admin_only" ON public.admin_overrides FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        CREATE POLICY "admin_overrides_service_role" ON public.admin_overrides FOR SELECT 
            USING (((auth.jwt() ->> 'role') = 'service_role' OR is_admin()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SYSTEM SETTINGS POLICIES (Critical - system configuration)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings' AND table_schema = 'public') THEN
        CREATE POLICY "system_settings_admin_manage" ON public.system_settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        -- Some system settings might be readable by authenticated users
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'is_public' AND table_schema = 'public') THEN
            CREATE POLICY "system_settings_public_readable" ON public.system_settings FOR SELECT 
                USING ((is_public = true OR is_admin()));
        END IF;
        
        -- Service role needs access for system operations
        CREATE POLICY "system_settings_service_read" ON public.system_settings FOR SELECT 
            USING (((auth.jwt() ->> 'role') = 'service_role' OR is_admin()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DELIVERY ADDRESSES POLICIES (Critical - user delivery management)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_addresses' AND table_schema = 'public') THEN
        CREATE POLICY "delivery_addresses_admin_all" ON public.delivery_addresses FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_addresses' AND column_name = 'user_id' AND table_schema = 'public') THEN
            CREATE POLICY "delivery_addresses_users_own" ON public.delivery_addresses FOR ALL 
                USING ((auth.uid() = user_id OR is_admin())) 
                WITH CHECK ((auth.uid() = user_id OR is_admin()));
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'delivery_addresses' AND column_name = 'customer_id' AND table_schema = 'public') THEN
            CREATE POLICY "delivery_addresses_customers_own" ON public.delivery_addresses FOR ALL 
                USING ((auth.uid() = customer_id OR is_admin())) 
                WITH CHECK ((auth.uid() = customer_id OR is_admin()));
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PAYMENT TRANSACTIONS ENHANCED POLICIES
DO $$ BEGIN
    -- Add more comprehensive payment policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions' AND table_schema = 'public') THEN
        -- Users can view their payment history
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_transactions' AND column_name = 'customer_id' AND table_schema = 'public') THEN
            CREATE POLICY "payment_transactions_customer_view" ON public.payment_transactions FOR SELECT 
                USING ((auth.uid() = customer_id OR is_admin()));
        END IF;
        
        -- Service role can manage payments for processing
        CREATE POLICY "payment_transactions_service_manage" ON public.payment_transactions FOR ALL 
            USING (((auth.jwt() ->> 'role') = 'service_role' OR is_admin()))
            WITH CHECK (((auth.jwt() ->> 'role') = 'service_role' OR is_admin()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- WAREHOUSE SUITE ADDRESSES POLICIES (Critical for package forwarding)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_suite_addresses' AND table_schema = 'public') THEN
        CREATE POLICY "warehouse_addresses_admin_manage" ON public.warehouse_suite_addresses FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_suite_addresses' AND column_name = 'customer_id' AND table_schema = 'public') THEN
            CREATE POLICY "warehouse_addresses_customer_own" ON public.warehouse_suite_addresses FOR ALL 
                USING ((auth.uid() = customer_id OR is_admin())) 
                WITH CHECK ((auth.uid() = customer_id OR is_admin()));
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RECEIVED PACKAGES POLICIES (Critical for package tracking)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'received_packages' AND table_schema = 'public') THEN
        CREATE POLICY "received_packages_admin_manage" ON public.received_packages FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        -- Customers can view their received packages
        CREATE POLICY "received_packages_customer_view" ON public.received_packages FOR SELECT 
            USING ((EXISTS (
                SELECT 1 FROM warehouse_suite_addresses 
                WHERE warehouse_suite_addresses.id = received_packages.warehouse_suite_address_id 
                AND warehouse_suite_addresses.customer_id = auth.uid()
            )) OR is_admin());
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Final verification count
DO $$
DECLARE
    updated_policy_count INTEGER;
    improvement INTEGER;
    coverage_percentage NUMERIC;
BEGIN
    SELECT COUNT(*) INTO updated_policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    improvement := updated_policy_count - 131; -- Previous count was 131
    coverage_percentage := round((updated_policy_count::numeric / 245) * 100, 1);
    
    RAISE NOTICE '=== MISSING POLICIES ADDED ===';
    RAISE NOTICE 'Previous Policy Count: 131';
    RAISE NOTICE 'Updated Policy Count: %', updated_policy_count;
    RAISE NOTICE 'Added % new policies', improvement;
    RAISE NOTICE 'Coverage: % percent of local target', coverage_percentage;
    
    IF updated_policy_count >= 200 THEN
        RAISE NOTICE '✅ EXCELLENT: Strong policy coverage achieved';
    ELSIF updated_policy_count >= 150 THEN
        RAISE NOTICE '🟡 GOOD: Solid improvement, approaching target';
    ELSE
        RAISE NOTICE '🔄 PROGRESS: Good improvement, more policies needed';
    END IF;
END $$;