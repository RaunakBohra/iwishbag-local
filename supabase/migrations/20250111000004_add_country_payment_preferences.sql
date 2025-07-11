-- Create table for country-specific payment gateway preferences
-- This allows different countries to have different payment method priorities

CREATE TABLE IF NOT EXISTS public.country_payment_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code TEXT NOT NULL,
    gateway_code TEXT NOT NULL,
    priority INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Ensure unique priority per country
    CONSTRAINT unique_country_gateway UNIQUE(country_code, gateway_code),
    CONSTRAINT unique_country_priority UNIQUE(country_code, priority),
    
    -- Foreign key to payment_gateways
    CONSTRAINT fk_country_payment_preferences_gateway 
        FOREIGN KEY (gateway_code) 
        REFERENCES public.payment_gateways(code) 
        ON DELETE CASCADE,
        
    -- Foreign key to country_settings
    CONSTRAINT fk_country_payment_preferences_country 
        FOREIGN KEY (country_code) 
        REFERENCES public.country_settings(code) 
        ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_country_payment_preferences_country ON public.country_payment_preferences(country_code);
CREATE INDEX IF NOT EXISTS idx_country_payment_preferences_priority ON public.country_payment_preferences(country_code, priority);
CREATE INDEX IF NOT EXISTS idx_country_payment_preferences_active ON public.country_payment_preferences(is_active);

-- Enable RLS
ALTER TABLE public.country_payment_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Country payment preferences are viewable by everyone" ON public.country_payment_preferences
    FOR SELECT USING (true);

CREATE POLICY "Country payment preferences are manageable by admins" ON public.country_payment_preferences
    FOR ALL USING (is_admin());

-- Add trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_country_payment_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_country_payment_preferences_updated_at
    BEFORE UPDATE ON public.country_payment_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_country_payment_preferences_updated_at();

-- Country preferences will be populated after payment gateways are configured
-- This table is ready for use once gateways are added to the payment_gateways table

-- Additional countries can be added when their specific gateways are configured

-- Add comment to document the table
COMMENT ON TABLE public.country_payment_preferences IS 'Country-specific payment gateway preferences and priorities';