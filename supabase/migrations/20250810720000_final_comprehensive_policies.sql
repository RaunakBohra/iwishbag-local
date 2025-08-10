-- ============================================================================
-- FINAL COMPREHENSIVE POLICIES 
-- Add remaining detailed policies to reach 245+ target
-- ============================================================================

-- PRICING AND CONFIGURATION DETAILED POLICIES
DO $$ BEGIN
    -- Addon Services - Public read active, admin manage
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'addon_services' AND table_schema = 'public') THEN
        CREATE POLICY "addon_services_admin_all" ON public.addon_services FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'addon_services' AND column_name = 'is_active' AND table_schema = 'public') THEN
            CREATE POLICY "addon_services_public_active" ON public.addon_services FOR SELECT 
                USING ((is_active = true AND auth.uid() IS NOT NULL));
        END IF;
        
        CREATE POLICY "addon_services_public_read" ON public.addon_services FOR SELECT USING ((is_active = true));
        CREATE POLICY "addon_services_auth_read" ON public.addon_services FOR SELECT USING (((is_active = true) AND (auth.uid() IS NOT NULL)));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Continental Pricing - Public read active, admin manage
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'continental_pricing' AND table_schema = 'public') THEN
        CREATE POLICY "continental_pricing_admin_all" ON public.continental_pricing FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'continental_pricing' AND column_name = 'is_active' AND table_schema = 'public') THEN
            CREATE POLICY "continental_pricing_public_active" ON public.continental_pricing FOR SELECT 
                USING ((is_active = true));
            CREATE POLICY "continental_pricing_auth_active" ON public.continental_pricing FOR SELECT 
                USING (((is_active = true) AND (auth.uid() IS NOT NULL)));
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Country Pricing Overrides - Public read active within date range
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'country_pricing_overrides' AND table_schema = 'public') THEN
        CREATE POLICY "country_overrides_admin_all" ON public.country_pricing_overrides FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'country_pricing_overrides' AND column_name = 'is_active' AND table_schema = 'public')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'country_pricing_overrides' AND column_name = 'effective_from' AND table_schema = 'public')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'country_pricing_overrides' AND column_name = 'effective_until' AND table_schema = 'public') THEN
            CREATE POLICY "country_overrides_public_active" ON public.country_pricing_overrides FOR SELECT 
                USING (((is_active = true) AND ((effective_from IS NULL) OR (effective_from <= now())) AND ((effective_until IS NULL) OR (effective_until > now()))));
            CREATE POLICY "country_overrides_auth_active" ON public.country_pricing_overrides FOR SELECT 
                USING (((is_active = true) AND ((effective_from IS NULL) OR (effective_from <= now())) AND ((effective_until IS NULL) OR (effective_until > now())) AND (auth.uid() IS NOT NULL)));
        ELSE
            CREATE POLICY "country_overrides_public_read" ON public.country_pricing_overrides FOR SELECT USING (true);
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CUSTOMER INTERACTION POLICIES
DO $$ BEGIN
    -- Customer Discount Usage - Users see own usage, service role can manage
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_discount_usage' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_discount_usage' AND column_name = 'customer_id' AND table_schema = 'public') THEN
            CREATE POLICY "discount_usage_users_own" ON public.customer_discount_usage FOR SELECT 
                USING (((auth.uid() = customer_id) OR is_admin()));
            CREATE POLICY "discount_usage_users_view_own" ON public.customer_discount_usage FOR SELECT 
                USING ((auth.uid() = customer_id));
        END IF;
        
        CREATE POLICY "discount_usage_system_manage" ON public.customer_discount_usage FOR ALL
            USING (((auth.jwt() ->> 'role') = 'service_role' OR is_admin()));
        CREATE POLICY "discount_usage_system_record" ON public.customer_discount_usage FOR INSERT 
            WITH CHECK (true);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Customer Satisfaction Surveys - Users create for own tickets (safe version)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_satisfaction_surveys' AND table_schema = 'public') THEN
        CREATE POLICY "satisfaction_surveys_admin_manage" ON public.customer_satisfaction_surveys FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        -- Only create detailed policies if both tables and required columns exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_system' AND table_schema = 'public')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_system' AND column_name = 'customer_id' AND table_schema = 'public')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_satisfaction_surveys' AND column_name = 'ticket_id' AND table_schema = 'public') THEN
            CREATE POLICY "satisfaction_surveys_create_own" ON public.customer_satisfaction_surveys FOR INSERT 
                WITH CHECK ((ticket_id IN (SELECT id FROM support_system WHERE customer_id = auth.uid())));
            CREATE POLICY "satisfaction_surveys_view_own" ON public.customer_satisfaction_surveys FOR SELECT 
                USING ((ticket_id IN (SELECT id FROM support_system WHERE customer_id = auth.uid()) OR is_admin()));
        ELSE
            -- Fallback to basic auth policies
            CREATE POLICY "satisfaction_surveys_auth_read" ON public.customer_satisfaction_surveys FOR SELECT TO authenticated USING (true);
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DELIVERY AND LOGISTICS POLICIES
DO $$ BEGIN
    -- Delivery Provider Configs - Admin only
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_provider_configs' AND table_schema = 'public') THEN
        CREATE POLICY "delivery_configs_admin_only" ON public.delivery_provider_configs FOR ALL 
            USING (is_admin()) WITH CHECK (is_admin());
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Delivery Webhooks - Admin only
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delivery_webhooks' AND table_schema = 'public') THEN
        CREATE POLICY "delivery_webhooks_admin_only" ON public.delivery_webhooks FOR ALL 
            USING (is_admin()) WITH CHECK (is_admin());
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Pickup Time Slots - Public can view available slots
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pickup_time_slots' AND table_schema = 'public') THEN
        CREATE POLICY "pickup_slots_admin_manage" ON public.pickup_time_slots FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        CREATE POLICY "pickup_slots_public_view" ON public.pickup_time_slots FOR SELECT USING (true);
        CREATE POLICY "pickup_slots_auth_view" ON public.pickup_time_slots FOR SELECT TO authenticated USING (true);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- EMAIL AND COMMUNICATION DETAILED POLICIES
DO $$ BEGIN
    -- Email Settings - Admin manage, specific JWT role access
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_settings' AND table_schema = 'public') THEN
        CREATE POLICY "email_settings_admin_insert" ON public.email_settings FOR INSERT 
            WITH CHECK (((auth.jwt() ->> 'role') = 'admin' OR is_admin()));
        CREATE POLICY "email_settings_admin_read" ON public.email_settings FOR SELECT 
            USING (((auth.jwt() ->> 'role') = 'admin' OR is_admin()));
        CREATE POLICY "email_settings_admin_update" ON public.email_settings FOR UPDATE 
            USING (((auth.jwt() ->> 'role') = 'admin' OR is_admin()))
            WITH CHECK (((auth.jwt() ->> 'role') = 'admin' OR is_admin()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SUPPORT SYSTEM DETAILED POLICIES
DO $$ BEGIN
    -- Support Interactions - Users interact with own tickets, admins see all (safe version)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_interactions' AND table_schema = 'public') THEN
        CREATE POLICY "support_interactions_admin_manage" ON public.support_interactions FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        -- Check for customer_id column (more likely to exist than user_id)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_interactions' AND column_name = 'customer_id' AND table_schema = 'public') THEN
            CREATE POLICY "support_interactions_customer_own" ON public.support_interactions FOR ALL 
                USING ((customer_id = auth.uid() OR is_admin())) 
                WITH CHECK ((customer_id = auth.uid() OR is_admin()));
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_interactions' AND column_name = 'user_id' AND table_schema = 'public') THEN
            CREATE POLICY "support_interactions_user_own" ON public.support_interactions FOR ALL 
                USING ((user_id = auth.uid() OR is_admin())) 
                WITH CHECK ((user_id = auth.uid() OR is_admin()));
        ELSE
            -- Fallback to authenticated users
            CREATE POLICY "support_interactions_auth_access" ON public.support_interactions FOR SELECT TO authenticated USING (true);
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Support Assignment Rules - Authenticated users can view, admin manage
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_assignment_rules' AND table_schema = 'public') THEN
        CREATE POLICY "support_rules_auth_view" ON public.support_assignment_rules FOR SELECT TO authenticated USING (true);
        CREATE POLICY "support_rules_admin_all" ON public.support_assignment_rules FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        CREATE POLICY "support_rules_allow_auth" ON public.support_assignment_rules TO authenticated USING (true) WITH CHECK (true);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- MEMBERSHIP AND DISCOUNT DETAILED POLICIES
DO $$ BEGIN
    -- Membership Plans - Public read active plans
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'membership_plans' AND table_schema = 'public') THEN
        CREATE POLICY "membership_plans_admin_manage" ON public.membership_plans FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'membership_plans' AND column_name = 'is_active' AND table_schema = 'public') THEN
            CREATE POLICY "membership_plans_public_active" ON public.membership_plans FOR SELECT 
                USING ((is_active = true));
        ELSE
            CREATE POLICY "membership_plans_public_read" ON public.membership_plans FOR SELECT USING (true);
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Discount Types - Public view active types
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discount_types' AND table_schema = 'public') THEN
        CREATE POLICY "discount_types_admin_manage" ON public.discount_types FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discount_types' AND column_name = 'is_active' AND table_schema = 'public') THEN
            CREATE POLICY "discount_types_public_active" ON public.discount_types FOR SELECT 
                USING (((is_active = true) OR is_admin()));
        ELSE
            CREATE POLICY "discount_types_public_read" ON public.discount_types FOR SELECT USING (true);
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Payment Method Discounts - Public view active, admin manage
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_method_discounts' AND table_schema = 'public') THEN
        CREATE POLICY "payment_discounts_admin_manage" ON public.payment_method_discounts FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_method_discounts' AND column_name = 'is_active' AND table_schema = 'public') THEN
            CREATE POLICY "payment_discounts_public_active" ON public.payment_method_discounts FOR SELECT 
                USING (((is_active = true) OR is_admin()));
        ELSE
            CREATE POLICY "payment_discounts_public_read" ON public.payment_method_discounts FOR SELECT USING (true);
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- REGIONAL AND MARKET POLICIES
DO $$ BEGIN
    -- Markets - Public read active markets
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'markets' AND table_schema = 'public') THEN
        CREATE POLICY "markets_admin_manage" ON public.markets FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'markets' AND column_name = 'is_active' AND table_schema = 'public') THEN
            CREATE POLICY "markets_public_active" ON public.markets FOR SELECT 
                USING ((is_active = true));
        ELSE
            CREATE POLICY "markets_public_read" ON public.markets FOR SELECT USING (true);
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Market Countries - Public read
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'market_countries' AND table_schema = 'public') THEN
        CREATE POLICY "market_countries_admin_manage" ON public.market_countries FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        CREATE POLICY "market_countries_public_read" ON public.market_countries FOR SELECT 
            USING ((EXISTS (SELECT 1 FROM markets WHERE markets.id = market_countries.market_id AND markets.is_active = true)));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AUTHENTICATION AND OTP POLICIES
DO $$ BEGIN
    -- Phone OTPs - Service role manage, users cannot read
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'phone_otps' AND table_schema = 'public') THEN
        CREATE POLICY "phone_otps_service_role_manage" ON public.phone_otps TO service_role USING (true) WITH CHECK (true);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- NCM CONFIGURATION POLICIES
DO $$ BEGIN
    -- NCM Configurations - Admin modify, authenticated users view
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ncm_configurations' AND table_schema = 'public') THEN
        CREATE POLICY "ncm_configs_admin_modify" ON public.ncm_configurations FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        CREATE POLICY "ncm_configs_auth_view" ON public.ncm_configurations FOR SELECT 
            USING ((auth.uid() IS NOT NULL));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PRODUCT CLASSIFICATION POLICIES
DO $$ BEGIN
    -- Product Classifications - Admin modify, authenticated view
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_classifications' AND table_schema = 'public') THEN
        CREATE POLICY "product_class_admin_modify" ON public.product_classifications FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_classifications' AND column_name = 'is_active' AND table_schema = 'public') THEN
            CREATE POLICY "product_class_auth_view" ON public.product_classifications FOR SELECT TO authenticated 
                USING (((is_active = true) OR is_admin()));
        ELSE
            CREATE POLICY "product_class_auth_view" ON public.product_classifications FOR SELECT TO authenticated USING (true);
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- QUOTE TEMPLATE AND STATUS POLICIES
DO $$ BEGIN
    -- Quote Templates - Admin manage
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_templates' AND table_schema = 'public') THEN
        CREATE POLICY "quote_templates_admin_all" ON public.quote_templates FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        CREATE POLICY "quote_templates_admin_access" ON public.quote_templates USING (is_admin()) WITH CHECK (is_admin());
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Quote Statuses - Admin manage, authenticated read
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_statuses' AND table_schema = 'public') THEN
        CREATE POLICY "quote_statuses_admin_manage" ON public.quote_statuses FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        CREATE POLICY "quote_statuses_auth_read" ON public.quote_statuses FOR SELECT TO authenticated USING (true);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- SELLER AUTOMATION POLICIES
DO $$ BEGIN
    -- Seller Order Automation - Admin only
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_order_automation' AND table_schema = 'public') THEN
        CREATE POLICY "seller_automation_admin_only" ON public.seller_order_automation FOR ALL 
            USING (is_admin()) WITH CHECK (is_admin());
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Final comprehensive count report
DO $$
DECLARE
    final_policy_count INTEGER;
    total_improvement INTEGER;
    rls_table_count INTEGER;
    coverage_percentage NUMERIC;
BEGIN
    SELECT COUNT(*) INTO final_policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO rls_table_count 
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true;
    
    total_improvement := final_policy_count - 53; -- Original count was 53
    coverage_percentage := round((final_policy_count::numeric / 245) * 100, 1);
    
    RAISE NOTICE '=== FINAL COMPREHENSIVE POLICIES COMPLETE ===';
    RAISE NOTICE 'Total RLS Tables: %', rls_table_count;
    RAISE NOTICE 'Total Policies: %', final_policy_count;
    RAISE NOTICE 'Added % new policies total', total_improvement;
    RAISE NOTICE 'Local Target: 245+ policies';
    RAISE NOTICE 'Coverage: % percent of local target', coverage_percentage;
    
    IF final_policy_count >= 245 THEN
        RAISE NOTICE '✅ PERFECT: Matched or exceeded local database coverage!';
    ELSIF final_policy_count >= 200 THEN
        RAISE NOTICE '✅ EXCELLENT: Very close to local database coverage';
    ELSIF final_policy_count >= 150 THEN
        RAISE NOTICE '🟡 GOOD: Significant coverage, close to target';
    ELSIF final_policy_count >= 100 THEN
        RAISE NOTICE '🔄 PROGRESS: Good improvement, substantial policies added';
    ELSE
        RAISE NOTICE '🔄 BASIC: Some improvement, but needs more work';
    END IF;
    
    RAISE NOTICE '=== SYNC STATUS ===';
    RAISE NOTICE 'RLS Tables: % / 95 (% percent)', rls_table_count, round((rls_table_count::numeric / 95) * 100, 1);
    RAISE NOTICE 'Policies: % / 245+ (% percent)', final_policy_count, coverage_percentage;
END $$;