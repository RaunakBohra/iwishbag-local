-- Create default market groupings
INSERT INTO public.markets (name, code, description, is_primary, is_active, display_order) VALUES
('North America', 'NA', 'United States, Canada, and Mexico', true, true, 1),
('Europe', 'EU', 'European Union and surrounding countries', false, true, 2),
('Asia Pacific', 'APAC', 'Asia and Pacific region countries', false, true, 3),
('South America', 'SA', 'South American countries', false, true, 4),
('Middle East & Africa', 'MEA', 'Middle Eastern and African countries', false, true, 5),
('Oceania', 'OCE', 'Australia, New Zealand, and Pacific Islands', false, true, 6);

-- Populate market_countries with appropriate groupings
-- North America
INSERT INTO public.market_countries (market_id, country_code, is_primary_in_market, display_order)
SELECT 
    m.id,
    c.code,
    CASE WHEN c.code = 'US' THEN true ELSE false END,
    CASE 
        WHEN c.code = 'US' THEN 1
        WHEN c.code = 'CA' THEN 2
        WHEN c.code = 'MX' THEN 3
        ELSE 99
    END
FROM public.markets m
CROSS JOIN public.country_settings c
WHERE m.code = 'NA'
AND c.code IN ('US', 'CA', 'MX', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA', 
               'CU', 'HT', 'DO', 'JM', 'TT', 'BB', 'BS', 'AG', 'DM', 'GD', 
               'KN', 'LC', 'VC');

-- Europe
INSERT INTO public.market_countries (market_id, country_code, is_primary_in_market, display_order)
SELECT 
    m.id,
    c.code,
    CASE WHEN c.code = 'DE' THEN true ELSE false END,
    ROW_NUMBER() OVER (ORDER BY c.name)
FROM public.markets m
CROSS JOIN public.country_settings c
WHERE m.code = 'EU'
AND c.continent = 'Europe';

-- Asia Pacific
INSERT INTO public.market_countries (market_id, country_code, is_primary_in_market, display_order)
SELECT 
    m.id,
    c.code,
    CASE WHEN c.code = 'CN' THEN true ELSE false END,
    CASE 
        WHEN c.code IN ('CN', 'JP', 'IN', 'KR') THEN 1
        ELSE ROW_NUMBER() OVER (ORDER BY c.name) + 4
    END
FROM public.markets m
CROSS JOIN public.country_settings c
WHERE m.code = 'APAC'
AND c.continent = 'Asia'
AND c.code NOT IN ('AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'IL', 'SY', 'LB', 'IQ', 'IR', 'YE');

-- South America
INSERT INTO public.market_countries (market_id, country_code, is_primary_in_market, display_order)
SELECT 
    m.id,
    c.code,
    CASE WHEN c.code = 'BR' THEN true ELSE false END,
    CASE 
        WHEN c.code = 'BR' THEN 1
        WHEN c.code = 'AR' THEN 2
        ELSE ROW_NUMBER() OVER (ORDER BY c.name) + 2
    END
FROM public.markets m
CROSS JOIN public.country_settings c
WHERE m.code = 'SA'
AND c.continent = 'South America';

-- Middle East & Africa
INSERT INTO public.market_countries (market_id, country_code, is_primary_in_market, display_order)
SELECT 
    m.id,
    c.code,
    CASE WHEN c.code = 'AE' THEN true ELSE false END,
    ROW_NUMBER() OVER (ORDER BY 
        CASE WHEN c.code IN ('AE', 'SA', 'QA', 'KW') THEN 0 ELSE 1 END,
        c.name
    )
FROM public.markets m
CROSS JOIN public.country_settings c
WHERE m.code = 'MEA'
AND (c.continent = 'Africa' 
     OR c.code IN ('AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'IL', 'SY', 'LB', 'IQ', 'IR', 'YE'));

-- Oceania
INSERT INTO public.market_countries (market_id, country_code, is_primary_in_market, display_order)
SELECT 
    m.id,
    c.code,
    CASE WHEN c.code = 'AU' THEN true ELSE false END,
    CASE 
        WHEN c.code = 'AU' THEN 1
        WHEN c.code = 'NZ' THEN 2
        ELSE ROW_NUMBER() OVER (ORDER BY c.name) + 2
    END
FROM public.markets m
CROSS JOIN public.country_settings c
WHERE m.code = 'OCE'
AND c.continent = 'Oceania';

-- Create helpful views for market management
CREATE OR REPLACE VIEW public.market_country_summary AS
SELECT 
    m.id as market_id,
    m.name as market_name,
    m.code as market_code,
    m.is_primary as is_primary_market,
    COUNT(mc.country_code) as country_count,
    COUNT(CASE WHEN cs.is_active THEN 1 END) as active_country_count,
    STRING_AGG(
        CASE WHEN mc.is_primary_in_market THEN cs.name || ' (Primary)' ELSE NULL END, 
        ', '
    ) as primary_country
FROM public.markets m
LEFT JOIN public.market_countries mc ON m.id = mc.market_id
LEFT JOIN public.country_settings cs ON mc.country_code = cs.code
GROUP BY m.id, m.name, m.code, m.is_primary;

-- Create function to apply market-wide settings
CREATE OR REPLACE FUNCTION public.apply_market_settings(
    p_market_code TEXT,
    p_settings JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_market_id UUID;
    v_updated_count INTEGER := 0;
BEGIN
    -- Get market ID
    SELECT id INTO v_market_id
    FROM public.markets
    WHERE code = p_market_code;
    
    IF v_market_id IS NULL THEN
        RAISE EXCEPTION 'Market with code % not found', p_market_code;
    END IF;
    
    -- Update market settings
    UPDATE public.markets
    SET 
        settings = p_settings,
        updated_at = now()
    WHERE id = v_market_id;
    
    -- Apply settings to all countries in the market
    v_updated_count := public.bulk_update_countries_by_market(v_market_id, p_settings);
    
    RETURN v_updated_count;
END;
$$;

-- Grant necessary permissions
GRANT SELECT ON public.market_country_summary TO authenticated;