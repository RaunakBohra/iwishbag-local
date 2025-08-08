-- =====================================================
-- Fix Regional Pricing RLS Policies
-- =====================================================
-- Replaces deprecated has_role() function calls with is_admin()
-- Ensures regional pricing system works with current auth system
-- Created: 2025-08-08

-- =====================================================
-- 1. DROP EXISTING POLICIES
-- =====================================================

-- Drop existing policies that use has_role()
DROP POLICY IF EXISTS "Admin full access on addon_services" ON addon_services;
DROP POLICY IF EXISTS "Admin full access on continental_pricing" ON continental_pricing;
DROP POLICY IF EXISTS "Admin full access on regional_pricing" ON regional_pricing;
DROP POLICY IF EXISTS "Admin full access on country_pricing_overrides" ON country_pricing_overrides;
DROP POLICY IF EXISTS "Admin full access on pricing_calculation_cache" ON pricing_calculation_cache;

-- =====================================================
-- 2. CREATE NEW POLICIES WITH is_admin()
-- =====================================================

-- Addon Services: Admin full access
CREATE POLICY "Admin full access on addon_services" ON addon_services
    FOR ALL USING (is_admin());

-- Continental Pricing: Admin full access
CREATE POLICY "Admin full access on continental_pricing" ON continental_pricing
    FOR ALL USING (is_admin());

-- Regional Pricing: Admin full access
CREATE POLICY "Admin full access on regional_pricing" ON regional_pricing
    FOR ALL USING (is_admin());

-- Country Pricing Overrides: Admin full access
CREATE POLICY "Admin full access on country_pricing_overrides" ON country_pricing_overrides
    FOR ALL USING (is_admin());

-- Pricing Cache: Admin full access
CREATE POLICY "Admin full access on pricing_calculation_cache" ON pricing_calculation_cache
    FOR ALL USING (is_admin());

-- =====================================================
-- 3. ENSURE PUBLIC READ ACCESS STILL WORKS
-- =====================================================

-- Add explicit authenticated user policies for reading active data
CREATE POLICY "Authenticated read access on addon_services" ON addon_services
    FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read access on continental_pricing" ON continental_pricing
    FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read access on regional_pricing" ON regional_pricing
    FOR SELECT USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read access on country_pricing_overrides" ON country_pricing_overrides
    FOR SELECT USING (
        is_active = true 
        AND (effective_from IS NULL OR effective_from <= NOW())
        AND (effective_until IS NULL OR effective_until > NOW())
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Authenticated read access on pricing_calculation_cache" ON pricing_calculation_cache
    FOR SELECT USING (expires_at > NOW() AND auth.uid() IS NOT NULL);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE addon_services IS 'Regional pricing addon services - RLS policies updated 2025-08-08';