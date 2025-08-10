-- ============================================================================
-- CLOUD SCHEMA MIGRATION - ESSENTIAL TABLES ONLY
-- This migration creates the essential tables needed for the exchange rate system
-- ============================================================================

-- Create country_settings table
CREATE TABLE IF NOT EXISTS country_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    currency TEXT NOT NULL,
    rate_from_usd DECIMAL(15,8),
    flag_emoji TEXT,
    region TEXT,
    is_supported BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_key TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    body_html TEXT,
    body_text TEXT,
    variables JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create delivery_providers table
CREATE TABLE IF NOT EXISTS delivery_providers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_name TEXT NOT NULL,
    provider_code TEXT NOT NULL UNIQUE,
    supported_countries TEXT[] DEFAULT '{}',
    base_url TEXT,
    api_key_required BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_country_settings_code ON country_settings(code);
CREATE INDEX IF NOT EXISTS idx_country_settings_currency ON country_settings(currency);
CREATE INDEX IF NOT EXISTS idx_country_settings_rate ON country_settings(rate_from_usd);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_delivery_providers_code ON delivery_providers(provider_code);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_country_settings_updated_at 
    BEFORE UPDATE ON country_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_providers_updated_at 
    BEFORE UPDATE ON delivery_providers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();