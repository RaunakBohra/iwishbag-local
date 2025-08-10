-- ============================================================================
-- SAFE DETAILED POLICIES - Check column existence before creating policies
-- Add comprehensive user access patterns safely
-- ============================================================================

-- BLOG SYSTEM POLICIES
DO $$ BEGIN
    -- Blog Posts - Authors can manage own posts, public can read published
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_posts' AND table_schema = 'public') THEN
        CREATE POLICY "blog_posts_admin_all" ON public.blog_posts FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'author_id' AND table_schema = 'public') THEN
            CREATE POLICY "blog_posts_author_own" ON public.blog_posts FOR ALL 
                USING ((author_id = auth.uid() OR is_admin())) 
                WITH CHECK ((author_id = auth.uid() OR is_admin()));
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'status' AND table_schema = 'public') THEN
            CREATE POLICY "blog_posts_public_published" ON public.blog_posts FOR SELECT 
                USING ((status = 'published' OR author_id = auth.uid() OR is_admin()));
        END IF;
        
        CREATE POLICY "blog_posts_service_role" ON public.blog_posts TO service_role USING (true) WITH CHECK (true);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Blog Categories - Admin manage, public read
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_categories' AND table_schema = 'public') THEN
        CREATE POLICY "blog_categories_admin_all" ON public.blog_categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        CREATE POLICY "blog_categories_public_read" ON public.blog_categories FOR SELECT USING (true);
        CREATE POLICY "blog_categories_service_role" ON public.blog_categories TO service_role USING (true) WITH CHECK (true);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Blog Tags - Admin manage, public read
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_tags' AND table_schema = 'public') THEN
        CREATE POLICY "blog_tags_admin_all" ON public.blog_tags FOR ALL USING (is_admin()) WITH CHECK (is_admin());
        CREATE POLICY "blog_tags_public_read" ON public.blog_tags FOR SELECT USING (true);
        CREATE POLICY "blog_tags_service_role" ON public.blog_tags TO service_role USING (true) WITH CHECK (true);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CART AND CHECKOUT POLICIES
DO $$ BEGIN
    -- Cart Abandonment Events - Users see own events, admins see all
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cart_abandonment_events' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cart_abandonment_events' AND column_name = 'user_id' AND table_schema = 'public') THEN
            CREATE POLICY "cart_events_users_own" ON public.cart_abandonment_events FOR SELECT 
                USING ((auth.uid() = user_id OR is_admin()));
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN  
    -- Checkout Sessions - Users manage own sessions, guest sessions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkout_sessions' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_sessions' AND column_name = 'user_id' AND table_schema = 'public') THEN
            CREATE POLICY "checkout_users_own" ON public.checkout_sessions FOR ALL 
                USING ((auth.uid() = user_id OR is_admin())) 
                WITH CHECK ((auth.uid() = user_id OR is_admin()));
        END IF;
        
        -- Guest checkout support
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checkout_sessions' AND column_name = 'is_guest' AND table_schema = 'public') THEN
            CREATE POLICY "checkout_guest_access" ON public.checkout_sessions FOR ALL 
                USING ((is_guest = true OR auth.uid() = user_id OR is_admin())) 
                WITH CHECK ((is_guest = true OR auth.uid() = user_id OR is_admin()));
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DISCOUNT AND PRICING POLICIES  
DO $$ BEGIN
    -- Discount Application Log - Users see own usage, admins see all
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discount_application_log' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discount_application_log' AND column_name = 'customer_id' AND table_schema = 'public') THEN
            CREATE POLICY "discount_log_users_own" ON public.discount_application_log FOR SELECT 
                USING ((customer_id = auth.uid() OR is_admin()));
        END IF;
        
        CREATE POLICY "discount_log_system_insert" ON public.discount_application_log FOR INSERT 
            WITH CHECK (true);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Discount Campaigns - Public read active, admin manage
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discount_campaigns' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discount_campaigns' AND column_name = 'is_active' AND table_schema = 'public')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discount_campaigns' AND column_name = 'start_date' AND table_schema = 'public')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'discount_campaigns' AND column_name = 'end_date' AND table_schema = 'public') THEN
            CREATE POLICY "discount_campaigns_public_active" ON public.discount_campaigns FOR SELECT 
                USING ((is_active = true AND CURRENT_TIMESTAMP >= start_date AND (end_date IS NULL OR CURRENT_TIMESTAMP <= end_date)) OR is_admin());
        ELSE
            CREATE POLICY "discount_campaigns_public_read" ON public.discount_campaigns FOR SELECT USING (true);
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- QUOTE RELATED DETAILED POLICIES (avoiding order references)
DO $$ BEGIN
    -- Quote Items - Users see items from their quotes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_items' AND table_schema = 'public') THEN
        CREATE POLICY "quote_items_customer_view" ON public.quote_items FOR SELECT 
            USING ((EXISTS (SELECT 1 FROM quotes_v2 WHERE quotes_v2.id = quote_items.quote_id AND (quotes_v2.customer_id = auth.uid() OR quotes_v2.customer_email = auth.email()))) OR is_admin());
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Quote Items V2 - Users see items from their quotes  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_items_v2' AND table_schema = 'public') THEN
        CREATE POLICY "quote_items_v2_customer_view" ON public.quote_items_v2 FOR SELECT 
            USING ((EXISTS (SELECT 1 FROM quotes_v2 WHERE quotes_v2.id = quote_items_v2.quote_id AND (quotes_v2.customer_id = auth.uid() OR quotes_v2.customer_email = auth.email()))) OR is_admin());
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    -- Quote Documents - Users see documents for their quotes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_documents' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_documents' AND column_name = 'is_customer_visible' AND table_schema = 'public') THEN
            CREATE POLICY "quote_docs_customer_view" ON public.quote_documents FOR SELECT 
                USING (((EXISTS (SELECT 1 FROM quotes_v2 WHERE quotes_v2.id = quote_documents.quote_id AND (quotes_v2.customer_id = auth.uid() OR quotes_v2.customer_email = auth.email()))) OR is_admin()) 
                       AND (is_customer_visible = true OR uploaded_by = auth.uid() OR is_admin()));
        ELSE
            CREATE POLICY "quote_docs_customer_view" ON public.quote_documents FOR SELECT 
                USING ((EXISTS (SELECT 1 FROM quotes_v2 WHERE quotes_v2.id = quote_documents.quote_id AND (quotes_v2.customer_id = auth.uid() OR quotes_v2.customer_email = auth.email()))) OR is_admin());
        END IF;
        
        -- Users can upload documents for their quotes
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_documents' AND column_name = 'uploaded_by' AND table_schema = 'public') THEN
            CREATE POLICY "quote_docs_upload" ON public.quote_documents FOR INSERT 
                WITH CHECK ((uploaded_by = auth.uid() OR is_admin()));
                
            CREATE POLICY "quote_docs_manage_own" ON public.quote_documents FOR ALL 
                USING ((uploaded_by = auth.uid() OR is_admin())) 
                WITH CHECK ((uploaded_by = auth.uid() OR is_admin()));
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- MEMBERSHIP AND PREFERENCE POLICIES  
DO $$ BEGIN
    -- Customer Memberships - Users manage their memberships
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_memberships' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_memberships' AND column_name = 'customer_id' AND table_schema = 'public') THEN
            CREATE POLICY "memberships_users_own" ON public.customer_memberships FOR ALL 
                USING ((auth.uid() = customer_id OR is_admin())) 
                WITH CHECK ((auth.uid() = customer_id OR is_admin()));
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- COMMUNICATION POLICIES  
DO $$ BEGIN
    -- Messages - Users see messages they sent/received
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_id' AND table_schema = 'public') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'recipient_id' AND table_schema = 'public') THEN
            CREATE POLICY "messages_participant_access" ON public.messages FOR ALL 
                USING (((auth.uid() = sender_id) OR (auth.uid() = recipient_id) OR is_admin())) 
                WITH CHECK (((auth.uid() = sender_id) OR (auth.uid() = recipient_id) OR is_admin()));
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AUDIT AND SHARING POLICIES
DO $$ BEGIN
    -- Share Audit Log - Users see their own sharing activity
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'share_audit_log' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'share_audit_log' AND column_name = 'user_id' AND table_schema = 'public') THEN
            CREATE POLICY "share_log_users_own" ON public.share_audit_log FOR SELECT 
                USING ((user_id = auth.uid() OR is_admin()));
        END IF;
        
        -- Allow authenticated users to insert audit logs
        CREATE POLICY "share_log_insert" ON public.share_audit_log FOR INSERT 
            WITH CHECK ((auth.role() = 'authenticated'));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PUBLIC REFERENCE DATA POLICIES
DO $$ BEGIN
    -- Rejection Reasons - Public read active reasons
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rejection_reasons' AND table_schema = 'public') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rejection_reasons' AND column_name = 'is_active' AND table_schema = 'public') THEN
            CREATE POLICY "rejection_reasons_public_active" ON public.rejection_reasons FOR SELECT 
                USING ((is_active = true));
        ELSE
            CREATE POLICY "rejection_reasons_public_read" ON public.rejection_reasons FOR SELECT USING (true);
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PACKAGE AND DELIVERY POLICIES
DO $$ BEGIN
    -- Package Events - Admin view only for now
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'package_events' AND table_schema = 'public') THEN
        CREATE POLICY "package_events_admin_view" ON public.package_events FOR SELECT USING (is_admin());
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ROUTE CUSTOMS TIERS - Authenticated users can read
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_customs_tiers' AND table_schema = 'public') THEN
        CREATE POLICY "customs_tiers_auth_read" ON public.route_customs_tiers FOR SELECT 
            USING ((auth.role() = 'authenticated' OR is_admin()));
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PRICING TIERS - Public can view active tiers
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discount_tiers' AND table_schema = 'public') THEN
        CREATE POLICY "discount_tiers_public_view" ON public.discount_tiers FOR SELECT USING (true);
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Final count report
DO $$
DECLARE
    policy_count INTEGER;
    improvement INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    improvement := policy_count - 53; -- Original count was 53
    
    RAISE NOTICE '=== SAFE DETAILED POLICIES ADDED ===';
    RAISE NOTICE 'Total Policies Now: %', policy_count;
    RAISE NOTICE 'Added % new policies', improvement;
    RAISE NOTICE 'Target: 245+ policies';
    
    IF policy_count >= 200 THEN
        RAISE NOTICE '✅ EXCELLENT: Close to local database coverage';
    ELSIF policy_count >= 150 THEN
        RAISE NOTICE '🟡 GOOD: Significant improvement from basic policies';
    ELSIF policy_count >= 100 THEN
        RAISE NOTICE '🔄 PROGRESS: Good improvement, more policies added';
    ELSE
        RAISE NOTICE '🔄 BASIC: Some improvement, need more detailed policies';
    END IF;
END $$;