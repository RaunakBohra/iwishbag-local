-- Fix admin policies for local database
-- This migration ensures admin policies are properly applied

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable admin full access to customs_categories" ON public.customs_categories;
DROP POLICY IF EXISTS "Enable admin full access to rejection_reasons" ON public.rejection_reasons;
DROP POLICY IF EXISTS "Enable admin full access to membership_tiers" ON public.membership_tiers;
DROP POLICY IF EXISTS "Enable admin full access to referral_rewards" ON public.referral_rewards;
DROP POLICY IF EXISTS "Enable admin full access to tracking_templates" ON public.tracking_templates;
DROP POLICY IF EXISTS "Enable admin full access to email_templates" ON public.email_templates;
DROP POLICY IF EXISTS "Enable admin full access to quote_templates" ON public.quote_templates;
DROP POLICY IF EXISTS "Enable admin full access to system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Enable admin full access to bank_account_details" ON public.bank_account_details;
DROP POLICY IF EXISTS "Enable admin full access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Enable admin full access to payment_gateways" ON public.payment_gateways;
DROP POLICY IF EXISTS "Enable admin full access to footer_settings" ON public.footer_settings;

-- Create admin policies
CREATE POLICY "Enable admin full access to customs_categories" ON public.customs_categories
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enable admin full access to rejection_reasons" ON public.rejection_reasons
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enable admin full access to membership_tiers" ON public.membership_tiers
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enable admin full access to referral_rewards" ON public.referral_rewards
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enable admin full access to tracking_templates" ON public.tracking_templates
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enable admin full access to email_templates" ON public.email_templates
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enable admin full access to quote_templates" ON public.quote_templates
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enable admin full access to system_settings" ON public.system_settings
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enable admin full access to bank_account_details" ON public.bank_account_details
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enable admin full access to user_roles" ON public.user_roles
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enable admin full access to payment_gateways" ON public.payment_gateways
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Enable admin full access to footer_settings" ON public.footer_settings
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
