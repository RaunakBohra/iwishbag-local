-- Initial schema migration for local testing
-- This sets up the essential tables for eSewa testing

-- Create basic tables needed for eSewa testing
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email VARCHAR(255),
    customer_name VARCHAR(255),
    item_price DECIMAL(10, 2),
    final_total DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shipping_address JSONB,
    breakdown JSONB,
    in_cart BOOLEAN DEFAULT FALSE
);

-- Create payment gateways table
CREATE TABLE IF NOT EXISTS public.payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    config JSONB,
    test_mode BOOLEAN DEFAULT TRUE,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create country settings table
CREATE TABLE IF NOT EXISTS public.country_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(2) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    rate_from_usd DECIMAL(10, 4) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert eSewa payment gateway configuration
INSERT INTO public.payment_gateways (code, name, config, test_mode, enabled) VALUES
('esewa', 'eSewa', '{
    "product_code": "EPAYTEST",
    "secret_key": "8gBm/:&EnhH.1/q",
    "api_version": "v2",
    "test_url": "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    "live_url": "https://epay.esewa.com.np/api/epay/main/v2/form"
}', true, true)
ON CONFLICT (code) DO UPDATE SET
    config = EXCLUDED.config,
    test_mode = EXCLUDED.test_mode,
    enabled = EXCLUDED.enabled;

-- Insert Nepal country settings
INSERT INTO public.country_settings (code, name, currency, rate_from_usd) VALUES
('NP', 'Nepal', 'NPR', 134.0)
ON CONFLICT (code) DO UPDATE SET
    currency = EXCLUDED.currency,
    rate_from_usd = EXCLUDED.rate_from_usd;

-- Insert US country settings
INSERT INTO public.country_settings (code, name, currency, rate_from_usd) VALUES
('US', 'United States', 'USD', 1.0)
ON CONFLICT (code) DO UPDATE SET
    currency = EXCLUDED.currency,
    rate_from_usd = EXCLUDED.rate_from_usd;

-- Insert test quote for eSewa testing
INSERT INTO public.quotes (id, email, customer_name, item_price, final_total, currency, status, shipping_address, breakdown) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'test@example.com', 'Test Customer', 100.00, 100.00, 'USD', 'pending', 
'{"country": "NP", "city": "Kathmandu", "address_line1": "Test Address"}',
'{"item_price": 100.00, "final_total": 100.00, "currency": "USD"}'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    customer_name = EXCLUDED.customer_name,
    item_price = EXCLUDED.item_price,
    final_total = EXCLUDED.final_total;

-- Enable RLS (Row Level Security) but allow all for testing
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_settings ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for testing
CREATE POLICY "Allow all operations for testing" ON public.quotes FOR ALL USING (true);
CREATE POLICY "Allow all operations for testing" ON public.payment_gateways FOR ALL USING (true);
CREATE POLICY "Allow all operations for testing" ON public.country_settings FOR ALL USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_gateways_updated_at BEFORE UPDATE ON public.payment_gateways
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_country_settings_updated_at BEFORE UPDATE ON public.country_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();