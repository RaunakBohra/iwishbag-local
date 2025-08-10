-- ============================================================================
-- CORE RLS POLICIES - Essential Security Policies
-- Creating the most important RLS policies for system functionality  
-- ============================================================================

-- Enable RLS on core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes_v2 ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.quote_items_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create essential policies using DO blocks for error handling
DO $$
BEGIN
    -- Profiles policies
    BEGIN
        CREATE POLICY "Users can manage own profile" ON public.profiles 
            FOR ALL TO public USING (auth.uid() = id);
    EXCEPTION WHEN duplicate_object THEN
        NULL; -- Policy already exists
    END;

    BEGIN
        CREATE POLICY "Admins can modify all profiles" ON public.profiles 
            FOR ALL TO public USING (is_admin()) WITH CHECK (is_admin());
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    -- Quotes policies
    BEGIN
        CREATE POLICY "Admin full access to quotes_v2" ON public.quotes_v2 
            FOR ALL TO authenticated USING (is_admin());
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        CREATE POLICY "Customers can view own quotes_v2" ON public.quotes_v2 
            FOR SELECT TO authenticated USING (customer_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    -- Orders policies
    BEGIN
        CREATE POLICY "Admins can manage all orders" ON public.orders 
            FOR ALL TO authenticated USING (is_admin());
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        CREATE POLICY "Users can view their own orders" ON public.orders 
            FOR SELECT TO authenticated USING (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    -- Payment transactions policies
    BEGIN
        CREATE POLICY "Admins have full access to payments" ON public.payment_transactions 
            FOR ALL TO public USING (is_admin());
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        CREATE POLICY "Users can view their own transactions" ON public.payment_transactions 
            FOR SELECT TO public USING (user_id = auth.uid());
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    -- Delivery addresses policies
    BEGIN
        CREATE POLICY "Users can manage own delivery addresses" ON public.delivery_addresses 
            FOR ALL TO public USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    -- Shipping routes policies
    BEGIN
        CREATE POLICY "Admin can manage shipping routes" ON public.shipping_routes 
            FOR ALL TO public USING (is_admin());
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    BEGIN
        CREATE POLICY "Public can read active shipping routes" ON public.shipping_routes 
            FOR SELECT TO public USING (is_active = true);
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    -- Country settings policies
    BEGIN
        CREATE POLICY "Public read access to country settings" ON public.country_settings 
            FOR SELECT TO public USING (true);
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    -- Support system policies
    BEGIN
        CREATE POLICY "Users can view their own tickets" ON public.support_system 
            FOR SELECT TO public USING ((auth.uid() = user_id) OR is_admin());
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;

    -- User roles policies
    BEGIN
        CREATE POLICY "Users can view their own roles" ON public.user_roles 
            FOR SELECT TO public USING (auth.uid() = user_id);
    EXCEPTION WHEN duplicate_object THEN
        NULL;
    END;
END $$;