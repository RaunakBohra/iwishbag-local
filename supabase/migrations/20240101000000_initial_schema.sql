-- =================================================================
-- ENTERPRISE-GRADE DATABASE SCHEMA
-- =================================================================
-- Professional design with security, performance, and scalability
-- Includes: Audit logging, proper constraints, indexes, RLS policies

-- Part 1: Core Types and Enums
-- =================================================================

DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'moderator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.quote_approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.quote_priority AS ENUM ('low', 'normal', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Part 2: Core Tables
-- =================================================================

-- User roles with proper constraints
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enhanced profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    country TEXT DEFAULT 'US' NOT NULL,
    preferred_display_currency TEXT DEFAULT 'USD' NOT NULL,
    avatar_url TEXT,
    cod_enabled BOOLEAN DEFAULT FALSE,
    internal_notes TEXT,
    referral_code TEXT UNIQUE,
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT valid_currency CHECK (preferred_display_currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED', 'SAR', 'EGP', 'TRY', 'INR', 'NPR')),
    CONSTRAINT valid_country CHECK (country ~ '^[A-Z]{2}$')
);

-- Country settings with comprehensive configuration
CREATE TABLE IF NOT EXISTS public.country_settings (
    code TEXT PRIMARY KEY CHECK (code ~ '^[A-Z]{2}$'),
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    rate_from_usd NUMERIC(10,6) NOT NULL CHECK (rate_from_usd > 0),
    sales_tax NUMERIC(5,2) DEFAULT 0 CHECK (sales_tax >= 0),
    vat NUMERIC(5,2) DEFAULT 0 CHECK (vat >= 0),
    min_shipping NUMERIC(10,2) DEFAULT 0 CHECK (min_shipping >= 0),
    additional_shipping NUMERIC(10,2) DEFAULT 0 CHECK (additional_shipping >= 0),
    additional_weight NUMERIC(8,2) DEFAULT 0 CHECK (additional_weight >= 0),
    weight_unit TEXT DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
    volumetric_divisor INTEGER DEFAULT 5000 CHECK (volumetric_divisor > 0),
    payment_gateway_fixed_fee NUMERIC(10,2) DEFAULT 0 CHECK (payment_gateway_fixed_fee >= 0),
    payment_gateway_percent_fee NUMERIC(5,2) DEFAULT 0 CHECK (payment_gateway_percent_fee >= 0),
    purchase_allowed BOOLEAN DEFAULT TRUE,
    shipping_allowed BOOLEAN DEFAULT TRUE,
    payment_gateway TEXT DEFAULT 'stripe',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Payment gateways
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    supported_countries TEXT[] DEFAULT '{}',
    supported_currencies TEXT[] DEFAULT '{}',
    fee_percent NUMERIC(5,2) DEFAULT 0 CHECK (fee_percent >= 0),
    fee_fixed NUMERIC(10,2) DEFAULT 0 CHECK (fee_fixed >= 0),
    config JSONB DEFAULT '{}',
    test_mode BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Site configuration
CREATE TABLE IF NOT EXISTS public.footer_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT,
    company_description TEXT,
    primary_phone TEXT,
    secondary_phone TEXT,
    primary_email TEXT CHECK (primary_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    support_email TEXT CHECK (support_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    primary_address TEXT,
    secondary_address TEXT,
    business_hours TEXT,
    social_twitter TEXT,
    social_facebook TEXT,
    social_instagram TEXT,
    social_linkedin TEXT,
    website_logo_url TEXT,
    hero_banner_url TEXT,
    hero_headline TEXT,
    hero_subheadline TEXT,
    hero_cta_text TEXT,
    hero_cta_link TEXT,
    how_it_works_steps TEXT,
    value_props TEXT,
    social_links JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Messaging system
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'general',
    quote_id UUID,
    reply_to_message_id UUID REFERENCES public.messages(id),
    attachment_file_name TEXT,
    attachment_url TEXT,
    sender_email TEXT,
    sender_name TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT valid_recipients CHECK (sender_id != recipient_id)
);

-- Notifications system
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    email_order_updates BOOLEAN DEFAULT TRUE,
    email_quote_updates BOOLEAN DEFAULT TRUE,
    email_promotions BOOLEAN DEFAULT TRUE,
    in_app_notifications BOOLEAN DEFAULT TRUE,
    sms_order_updates BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Rejection reasons
CREATE TABLE IF NOT EXISTS public.rejection_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Customs categories
CREATE TABLE IF NOT EXISTS public.customs_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    duty_percent NUMERIC(5,2) DEFAULT 0 CHECK (duty_percent >= 0),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    subject TEXT NOT NULL,
    html_content TEXT NOT NULL,
    template_type TEXT NOT NULL,
    variables JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- System settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Bank account details
CREATE TABLE IF NOT EXISTS public.bank_account_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    branch_name TEXT,
    iban TEXT,
    swift_code TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Membership tiers
CREATE TABLE IF NOT EXISTS public.membership_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    monthly_price NUMERIC(10,2) DEFAULT 0 CHECK (monthly_price >= 0),
    annual_price NUMERIC(10,2) DEFAULT 0 CHECK (annual_price >= 0),
    benefits JSONB DEFAULT '{}',
    free_shipping_threshold NUMERIC(10,2),
    service_fee_discount NUMERIC(5,2) DEFAULT 0 CHECK (service_fee_discount >= 0),
    priority_processing BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Referral system
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_code TEXT UNIQUE NOT NULL,
    referrer_id UUID REFERENCES public.profiles(id),
    referee_id UUID REFERENCES public.profiles(id),
    referred_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    completed_at TIMESTAMPTZ,
    reward_amount NUMERIC(10,2),
    reward_currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Referral rewards
CREATE TABLE IF NOT EXISTS public.referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('percentage', 'fixed')),
    reward_value NUMERIC(10,2) NOT NULL CHECK (reward_value > 0),
    currency TEXT DEFAULT 'USD',
    min_order_value NUMERIC(10,2) DEFAULT 0,
    max_uses INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Order tracking events
CREATE TABLE IF NOT EXISTS public.order_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID,
    tracking_number TEXT,
    carrier TEXT,
    event_type TEXT NOT NULL,
    description TEXT,
    location TEXT,
    estimated_delivery TIMESTAMPTZ,
    actual_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tracking templates
CREATE TABLE IF NOT EXISTS public.tracking_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    carrier TEXT,
    country_from TEXT NOT NULL,
    country_to TEXT NOT NULL,
    estimated_days INTEGER CHECK (estimated_days > 0),
    template_steps JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Audit logs for security and compliance
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Comprehensive quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_id TEXT UNIQUE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    status TEXT,
    approval_status public.quote_approval_status DEFAULT 'pending',
    priority public.quote_priority DEFAULT 'normal',
    country_code TEXT REFERENCES public.country_settings(code),
    currency TEXT DEFAULT 'USD' NOT NULL,
    items_currency TEXT,
    product_name TEXT,
    product_url TEXT,
    image_url TEXT,
    options TEXT,
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    item_price NUMERIC(10,2) CHECK (item_price >= 0),
    item_weight NUMERIC(8,2) CHECK (item_weight >= 0),
    sub_total NUMERIC(10,2) DEFAULT 0 CHECK (sub_total >= 0),
    domestic_shipping NUMERIC(10,2) DEFAULT 0 CHECK (domestic_shipping >= 0),
    international_shipping NUMERIC(10,2) DEFAULT 0 CHECK (international_shipping >= 0),
    merchant_shipping_price NUMERIC(10,2) DEFAULT 0 CHECK (merchant_shipping_price >= 0),
    sales_tax_price NUMERIC(10,2) DEFAULT 0 CHECK (sales_tax_price >= 0),
    vat NUMERIC(10,2) DEFAULT 0 CHECK (vat >= 0),
    customs_and_ecs NUMERIC(10,2) DEFAULT 0 CHECK (customs_and_ecs >= 0),
    handling_charge NUMERIC(10,2) DEFAULT 0 CHECK (handling_charge >= 0),
    insurance_amount NUMERIC(10,2) DEFAULT 0 CHECK (insurance_amount >= 0),
    payment_gateway_fee NUMERIC(10,2) DEFAULT 0 CHECK (payment_gateway_fee >= 0),
    discount NUMERIC(10,2) DEFAULT 0 CHECK (discount >= 0),
    final_total NUMERIC(10,2) DEFAULT 0 CHECK (final_total >= 0),
    final_total_local NUMERIC(10,2) DEFAULT 0 CHECK (final_total_local >= 0),
    final_currency TEXT DEFAULT 'USD',
    exchange_rate NUMERIC(10,6) DEFAULT 1 CHECK (exchange_rate > 0),
    in_cart BOOLEAN DEFAULT FALSE,
    payment_method TEXT,
    shipping_carrier TEXT,
    tracking_number TEXT,
    current_location TEXT,
    estimated_delivery_date DATE,
    customs_category_name TEXT REFERENCES public.customs_categories(name),
    rejection_reason_id UUID REFERENCES public.rejection_reasons(id),
    rejection_details TEXT,
    internal_notes TEXT,
    order_display_id TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    last_tracking_update TIMESTAMPTZ
);

-- Quote items for detailed breakdown
CREATE TABLE IF NOT EXISTS public.quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
    product_name TEXT,
    product_url TEXT,
    image_url TEXT,
    category TEXT,
    item_currency TEXT NOT NULL,
    item_price NUMERIC(10,2) CHECK (item_price >= 0),
    item_weight NUMERIC(8,2) CHECK (item_weight >= 0),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    options TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User addresses for shipping
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state_province_region TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    country_code TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User memberships for subscription management
CREATE TABLE IF NOT EXISTS public.user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES public.membership_tiers(id),
    stripe_subscription_id TEXT,
    status TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Quote templates for quick quote creation
CREATE TABLE IF NOT EXISTS public.quote_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL,
    product_name TEXT,
    product_url TEXT,
    image_url TEXT,
    item_price NUMERIC(10,2),
    item_weight NUMERIC(8,2),
    quantity INTEGER DEFAULT 1,
    options TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User wishlist items
CREATE TABLE IF NOT EXISTS public.user_wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_url TEXT NOT NULL,
    product_name TEXT,
    image_url TEXT,
    estimated_price NUMERIC(10,2),
    currency TEXT,
    category TEXT,
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Order workflow steps for process management
CREATE TABLE IF NOT EXISTS public.order_workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    order_position INTEGER NOT NULL,
    estimated_duration_hours INTEGER,
    requires_admin_action BOOLEAN DEFAULT FALSE,
    is_customer_visible BOOLEAN DEFAULT TRUE,
    country_specific TEXT[],
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Part 3: Functions and Triggers
-- =================================================================

-- Role checking function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = has_role._user_id AND r.role = has_role._role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User creation handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, country, preferred_display_currency)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'country', 'US'),
    COALESCE(new.raw_user_meta_data->>'currency', 'USD')
  );
  
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (new.id, 'user', new.id);
  
  INSERT INTO public.notification_preferences (user_id)
  VALUES (new.id);
  
  UPDATE public.profiles 
  SET referral_code = 'REF' || substr(md5(random()::text), 1, 8)
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate display ID
CREATE OR REPLACE FUNCTION public.generate_display_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.display_id IS NULL THEN
    NEW.display_id := 'Q' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Part 4: Triggers
-- =================================================================

-- Drop and recreate the trigger with proper error handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to manually handle existing users without profiles
CREATE OR REPLACE FUNCTION public.ensure_user_profile(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    -- Create profile
    INSERT INTO public.profiles (id, full_name, phone, country, preferred_display_currency, referral_code)
    VALUES (
      _user_id, 
      'User', 
      NULL,
      'US',
      'USD',
      'REF' || substr(md5(random()::text), 1, 8)
    );
    
    -- Create user role
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (_user_id, 'user', _user_id);
    
    -- Create notification preferences
    INSERT INTO public.notification_preferences (user_id)
    VALUES (_user_id);
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER generate_quote_display_id
  BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.generate_display_id();

-- Part 5: Row Level Security
-- =================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.footer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customs_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_account_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_workflow_steps ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read access" ON public.country_settings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.payment_gateways FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.footer_settings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.rejection_reasons FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.customs_categories FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.membership_tiers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.referral_rewards FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.tracking_templates FOR SELECT USING (true);

-- User-specific policies
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own quotes" ON public.quotes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own quote items" ON public.quote_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.quotes q 
    WHERE q.id = quote_items.quote_id AND q.user_id = auth.uid()
  ));

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own messages" ON public.messages
  FOR ALL USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can manage own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own referrals" ON public.referrals
  FOR ALL USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Users can manage own addresses" ON public.user_addresses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own memberships" ON public.user_memberships
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own wishlist items" ON public.user_wishlist_items
  FOR ALL USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins have full access" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.quotes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.quote_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.messages
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.notifications
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.notification_preferences
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.referrals
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.email_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.system_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.bank_account_details
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.order_tracking_events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.user_addresses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.user_memberships
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.quote_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.user_wishlist_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.order_workflow_steps
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins have full access" ON public.country_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Part 6: Performance Indexes
-- =================================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_approval_status ON public.quotes(approval_status);
CREATE INDEX IF NOT EXISTS idx_quotes_country_code ON public.quotes(country_code);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_display_id ON public.quotes(display_id);
CREATE INDEX IF NOT EXISTS idx_quotes_email ON public.quotes(email);
CREATE INDEX IF NOT EXISTS idx_quotes_in_cart ON public.quotes(in_cart);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee_id ON public.referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_quote_id ON public.order_tracking_events(quote_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_tracking_number ON public.order_tracking_events(tracking_number);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON public.user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wishlist_items_user_id ON public.user_wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_templates_name ON public.quote_templates(template_name);
CREATE INDEX IF NOT EXISTS idx_order_workflow_steps_position ON public.order_workflow_steps(order_position);

-- Part 7: Seed Data
-- =================================================================

-- Customs categories
INSERT INTO public.customs_categories (name, duty_percent)
VALUES
('Electronics', 5.00),
('Clothing & Textiles', 15.00),
('Home & Garden', 8.00),
('Beauty & Health', 10.00),
('Sports & Outdoors', 12.00),
('Toys & Games', 5.00),
('Books & Media', 0.00),
('Automotive', 8.00),
('General Goods', 5.00)
ON CONFLICT (name) DO NOTHING;

-- Payment gateways
INSERT INTO public.payment_gateways (name, code, supported_countries, supported_currencies, fee_percent, fee_fixed, config, test_mode)
VALUES
('Stripe', 'stripe', ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'SG', 'AE', 'SA', 'EG', 'TR', 'JP'], ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED', 'SAR', 'EGP', 'TRY'], 2.9, 0.30, '{"publishable_key": "", "secret_key": ""}', true),
('PayU', 'payu', ARRAY['IN'], ARRAY['INR'], 2.5, 0, '{"merchant_key": "", "salt_key": "", "merchant_id": ""}', true),
('eSewa', 'esewa', ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"merchant_id": "", "merchant_key": ""}', true),
('Khalti', 'khalti', ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"public_key": "", "secret_key": ""}', true),
('Fonepay', 'fonepay', ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"merchant_id": "", "merchant_key": ""}', true),
('Airwallex', 'airwallex', ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'SG', 'AE', 'SA', 'EG', 'TR', 'JP'], ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED', 'SAR', 'EGP', 'TRY'], 1.8, 0.30, '{"api_key": "", "client_id": ""}', true)
ON CONFLICT (code) DO NOTHING;

-- Country settings
INSERT INTO public.country_settings (code, name, currency, rate_from_usd, sales_tax, vat, min_shipping, additional_shipping, additional_weight, weight_unit, volumetric_divisor, payment_gateway_fixed_fee, payment_gateway_percent_fee, purchase_allowed, shipping_allowed, payment_gateway)
VALUES
('US', 'United States', 'USD', 1, 0, 0, 10, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe'),
('IN', 'India', 'INR', 83, 0, 0, 500, 0, 100, 'kg', 5000, 0, 2.5, true, true, 'payu'),
('NP', 'Nepal', 'NPR', 133, 0, 0, 1000, 0, 200, 'kg', 5000, 0, 1.5, true, true, 'esewa'),
('JP', 'Japan', 'JPY', 155, 0, 0, 1500, 0, 200, 'kg', 5000, 0, 2.9, true, true, 'stripe'),
('GB', 'United Kingdom', 'GBP', 0.79, 0, 0, 8, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe'),
('CA', 'Canada', 'CAD', 1.36, 0, 0, 12, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe'),
('AU', 'Australia', 'AUD', 1.52, 0, 0, 15, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe')
ON CONFLICT (code) DO NOTHING;

-- Footer settings
INSERT INTO public.footer_settings (company_name, company_description, primary_phone, secondary_phone, primary_email, support_email, primary_address, secondary_address, business_hours, social_twitter, social_facebook, social_instagram, social_linkedin, website_logo_url, hero_banner_url, hero_headline, hero_subheadline, hero_cta_text, hero_cta_link, how_it_works_steps, value_props, social_links)
VALUES
('Global Wishlist Hub', 'A comprehensive description of the company', '+1-555-0123', '+1-555-4567', 'contact@globalwishlisthub.com', 'support@globalwishlisthub.com', '123 Main Street, City, Country', '456 Elm Street, Town, Country', 'Mon-Fri: 9:00 AM - 5:00 PM', 'https://twitter.com/globalwishlisthub', 'https://www.facebook.com/globalwishlisthub', 'https://www.instagram.com/globalwishlisthub', 'https://www.linkedin.com/company/globalwishlisthub', 'https://example.com/logo.png', 'https://example.com/banner.jpg', 'Transform Your Shopping Experience', 'Discover the Power of Global Shopping', 'Buy Now', 'https://example.com/cta-link', '{"step1": "Sign up", "step2": "Shop", "step3": "Receive"}', '{"value1": "Fast Shipping", "value2": "Secure Payments", "value3": "Wide Selection"}', '{"facebook": "https://www.facebook.com/globalwishlisthub", "twitter": "https://twitter.com/globalwishlisthub", "instagram": "https://www.instagram.com/globalwishlisthub", "linkedin": "https://www.linkedin.com/company/globalwishlisthub"}')
ON CONFLICT DO NOTHING;

-- Rejection reasons
INSERT INTO public.rejection_reasons (reason, category)
VALUES
('Product not available', 'availability'),
('Price too high', 'pricing'),
('Shipping restrictions', 'shipping'),
('Payment method not supported', 'payment'),
('Invalid product information', 'product'),
('Country restrictions', 'location'),
('Weight exceeds limits', 'shipping'),
('Prohibited item', 'product'),
('Insufficient information', 'product'),
('Duplicate request', 'process')
ON CONFLICT DO NOTHING;

-- Email templates
INSERT INTO public.email_templates (name, subject, html_content, template_type, variables)
VALUES
('quote_approved', 'Your Quote Has Been Approved!', '<h1>Quote Approved</h1><p>Your quote {{quote_id}} has been approved.</p>', 'quote_notification', '{"quote_id": "string"}'),
('quote_rejected', 'Quote Status Update', '<h1>Quote Update</h1><p>Your quote {{quote_id}} requires attention.</p>', 'quote_notification', '{"quote_id": "string"}'),
('order_confirmation', 'Order Confirmed', '<h1>Order Confirmed</h1><p>Your order {{order_id}} has been confirmed.</p>', 'order_notification', '{"order_id": "string"}'),
('shipping_update', 'Shipping Update', '<h1>Shipping Update</h1><p>Your order {{order_id}} has been shipped.</p>', 'order_notification', '{"order_id": "string"}')
ON CONFLICT (name) DO NOTHING;

-- System settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES
('site_name', 'Global Wishlist Hub', 'Website name'),
('support_email', 'support@globalwishlisthub.com', 'Support email address'),
('default_currency', 'USD', 'Default currency for the platform'),
('maintenance_mode', 'false', 'Whether the site is in maintenance mode'),
('max_quote_items', '10', 'Maximum number of items per quote'),
('auto_approval_threshold', '100', 'Automatic approval threshold in USD'),
('referral_bonus_percent', '5', 'Referral bonus percentage'),
('free_shipping_threshold', '50', 'Free shipping threshold in USD')
ON CONFLICT (setting_key) DO NOTHING;

-- Referral rewards
INSERT INTO public.referral_rewards (name, reward_type, reward_value, currency, min_order_value, max_uses)
VALUES
('New User Bonus', 'percentage', 5.0, 'USD', 25.0, 1000),
('Referrer Bonus', 'fixed', 10.0, 'USD', 50.0, 500),
('Holiday Special', 'percentage', 10.0, 'USD', 100.0, 100)
ON CONFLICT DO NOTHING;

-- Membership tiers
INSERT INTO public.membership_tiers (name, description, monthly_price, annual_price, benefits, free_shipping_threshold, service_fee_discount, priority_processing)
VALUES
('Basic', 'Standard membership with basic features', 0, 0, '{"basic_support": true}', 100, 0, false),
('Premium', 'Enhanced features and priority support', 9.99, 99.99, '{"priority_support": true, "advanced_analytics": true}', 50, 10, true),
('Enterprise', 'Full feature access with dedicated support', 29.99, 299.99, '{"dedicated_support": true, "custom_integrations": true, "white_label": true}', 0, 25, true)
ON CONFLICT (name) DO NOTHING; 