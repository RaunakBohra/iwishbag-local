-- Add admin policies for tables that need admin access
-- This migration adds full CRUD access for admin users to various system tables

-- Customs Categories - Admin full access
CREATE POLICY "Enable admin full access to customs_categories" ON public.customs_categories
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Rejection Reasons - Admin full access  
CREATE POLICY "Enable admin full access to rejection_reasons" ON public.rejection_reasons
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Membership Tiers - Admin full access
CREATE POLICY "Enable admin full access to membership_tiers" ON public.membership_tiers
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Referral Rewards - Admin full access
CREATE POLICY "Enable admin full access to referral_rewards" ON public.referral_rewards
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Tracking Templates - Admin full access
CREATE POLICY "Enable admin full access to tracking_templates" ON public.tracking_templates
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Email Templates - Admin full access
CREATE POLICY "Enable admin full access to email_templates" ON public.email_templates
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Quote Templates - Admin full access
CREATE POLICY "Enable admin full access to quote_templates" ON public.quote_templates
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- System Settings - Admin full access
CREATE POLICY "Enable admin full access to system_settings" ON public.system_settings
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Bank Account Details - Admin full access
CREATE POLICY "Enable admin full access to bank_account_details" ON public.bank_account_details
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- User Roles - Admin full access
CREATE POLICY "Enable admin full access to user_roles" ON public.user_roles
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Payment Gateways - Admin full access
CREATE POLICY "Enable admin full access to payment_gateways" ON public.payment_gateways
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Footer Settings - Admin full access
CREATE POLICY "Enable admin full access to footer_settings" ON public.footer_settings
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
