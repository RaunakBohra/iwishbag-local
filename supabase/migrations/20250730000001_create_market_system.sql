-- Create markets table for grouping countries (Shopify-style)
CREATE TABLE IF NOT EXISTS public.markets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add constraint to ensure only one primary market
CREATE UNIQUE INDEX idx_only_one_primary_market ON public.markets (is_primary) WHERE is_primary = true;

-- Create market_countries junction table
CREATE TABLE IF NOT EXISTS public.market_countries (
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL REFERENCES public.country_settings(code) ON DELETE CASCADE,
    is_primary_in_market BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (market_id, country_code)
);

-- Add constraint to ensure only one primary country per market
CREATE UNIQUE INDEX idx_one_primary_country_per_market 
ON public.market_countries (market_id, is_primary_in_market) 
WHERE is_primary_in_market = true;

-- Add comments
COMMENT ON TABLE public.markets IS 'Market groupings for countries, similar to Shopify Markets feature';
COMMENT ON COLUMN public.markets.name IS 'Display name of the market (e.g., North America, Europe)';
COMMENT ON COLUMN public.markets.code IS 'Unique code for the market (e.g., NA, EU, APAC)';
COMMENT ON COLUMN public.markets.is_primary IS 'Primary market for the store, only one allowed';
COMMENT ON COLUMN public.markets.settings IS 'Market-specific settings that can override country defaults';

COMMENT ON TABLE public.market_countries IS 'Junction table linking markets to countries';
COMMENT ON COLUMN public.market_countries.is_primary_in_market IS 'Primary country within this market';

-- Add RLS policies
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_countries ENABLE ROW LEVEL SECURITY;

-- Admin full access to markets
CREATE POLICY "Admins have full access to markets" ON public.markets
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins have full access to market_countries" ON public.market_countries
    USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Public read access to active markets
CREATE POLICY "Public read access to active markets" ON public.markets
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public read access to market_countries" ON public.market_countries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.markets m 
            WHERE m.id = market_countries.market_id 
            AND m.is_active = true
        )
    );

-- Create updated_at trigger for markets
CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON public.markets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get market for a country
CREATE OR REPLACE FUNCTION public.get_country_market(p_country_code TEXT)
RETURNS public.markets
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_market public.markets;
BEGIN
    SELECT m.* INTO v_market
    FROM public.markets m
    INNER JOIN public.market_countries mc ON m.id = mc.market_id
    WHERE mc.country_code = p_country_code
    AND m.is_active = true
    LIMIT 1;
    
    RETURN v_market;
END;
$$;

-- Create function to get all countries in a market
CREATE OR REPLACE FUNCTION public.get_market_countries(p_market_id UUID)
RETURNS TABLE (
    country_code TEXT,
    country_name TEXT,
    currency TEXT,
    is_primary_in_market BOOLEAN,
    display_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.code,
        cs.name,
        cs.currency,
        mc.is_primary_in_market,
        mc.display_order
    FROM public.country_settings cs
    INNER JOIN public.market_countries mc ON cs.code = mc.country_code
    WHERE mc.market_id = p_market_id
    ORDER BY mc.display_order, cs.name;
END;
$$;