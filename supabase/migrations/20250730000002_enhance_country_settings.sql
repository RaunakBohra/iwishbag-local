-- Enhance country_settings table with new columns for better management
ALTER TABLE public.country_settings
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_tax_calculation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS phone_code TEXT,
ADD COLUMN IF NOT EXISTS flag_emoji TEXT,
ADD COLUMN IF NOT EXISTS continent TEXT,
ADD COLUMN IF NOT EXISTS popular_payment_methods TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS date_format TEXT DEFAULT 'MM/DD/YYYY',
ADD COLUMN IF NOT EXISTS address_format JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS postal_code_regex TEXT,
ADD COLUMN IF NOT EXISTS postal_code_example TEXT,
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en';

-- Add check constraints
ALTER TABLE public.country_settings
ADD CONSTRAINT check_continent CHECK (
    continent IN ('Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America')
),
ADD CONSTRAINT check_date_format CHECK (
    date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY', 'DD-MM-YYYY')
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_country_settings_continent ON public.country_settings(continent);
CREATE INDEX IF NOT EXISTS idx_country_settings_is_active ON public.country_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_country_settings_currency ON public.country_settings(currency);

-- Add comments for new columns
COMMENT ON COLUMN public.country_settings.is_active IS 'Whether this country is currently active for operations';
COMMENT ON COLUMN public.country_settings.auto_tax_calculation IS 'Whether to automatically calculate taxes for this country';
COMMENT ON COLUMN public.country_settings.display_name IS 'Localized display name for the country';
COMMENT ON COLUMN public.country_settings.phone_code IS 'International dialing code (e.g., +1 for US)';
COMMENT ON COLUMN public.country_settings.flag_emoji IS 'Country flag emoji for UI display';
COMMENT ON COLUMN public.country_settings.continent IS 'Continent for geographical grouping';
COMMENT ON COLUMN public.country_settings.popular_payment_methods IS 'Array of commonly used payment methods in this country';
COMMENT ON COLUMN public.country_settings.timezone IS 'Primary timezone of the country';
COMMENT ON COLUMN public.country_settings.date_format IS 'Preferred date format for this country';
COMMENT ON COLUMN public.country_settings.address_format IS 'JSON structure defining address format requirements';
COMMENT ON COLUMN public.country_settings.postal_code_regex IS 'Regular expression for validating postal codes';
COMMENT ON COLUMN public.country_settings.postal_code_example IS 'Example postal code for user guidance';
COMMENT ON COLUMN public.country_settings.languages IS 'Array of languages commonly used in this country';
COMMENT ON COLUMN public.country_settings.default_language IS 'Default language code for this country';

-- Update existing countries with display names (if null)
UPDATE public.country_settings 
SET display_name = name 
WHERE display_name IS NULL;

-- Create function to bulk update countries by market
CREATE OR REPLACE FUNCTION public.bulk_update_countries_by_market(
    p_market_id UUID,
    p_updates JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    -- Update all countries in the specified market
    UPDATE public.country_settings cs
    SET 
        sales_tax = COALESCE((p_updates->>'sales_tax')::NUMERIC, cs.sales_tax),
        vat = COALESCE((p_updates->>'vat')::NUMERIC, cs.vat),
        min_shipping = COALESCE((p_updates->>'min_shipping')::NUMERIC, cs.min_shipping),
        additional_shipping = COALESCE((p_updates->>'additional_shipping')::NUMERIC, cs.additional_shipping),
        payment_gateway = COALESCE(p_updates->>'payment_gateway', cs.payment_gateway),
        available_gateways = COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(p_updates->'available_gateways')),
            cs.available_gateways
        ),
        purchase_allowed = COALESCE((p_updates->>'purchase_allowed')::BOOLEAN, cs.purchase_allowed),
        shipping_allowed = COALESCE((p_updates->>'shipping_allowed')::BOOLEAN, cs.shipping_allowed),
        is_active = COALESCE((p_updates->>'is_active')::BOOLEAN, cs.is_active),
        updated_at = now()
    FROM public.market_countries mc
    WHERE mc.country_code = cs.code
    AND mc.market_id = p_market_id;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$;

-- Create function to copy settings from one country to another
CREATE OR REPLACE FUNCTION public.copy_country_settings(
    p_from_country TEXT,
    p_to_country TEXT,
    p_fields TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_from_record public.country_settings%ROWTYPE;
BEGIN
    -- Get source country settings
    SELECT * INTO v_from_record 
    FROM public.country_settings 
    WHERE code = p_from_country;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source country % not found', p_from_country;
    END IF;
    
    -- If no specific fields specified, copy common settings
    IF p_fields IS NULL THEN
        p_fields := ARRAY[
            'sales_tax', 'vat', 'min_shipping', 'additional_shipping',
            'weight_unit', 'volumetric_divisor', 'payment_gateway_fixed_fee',
            'payment_gateway_percent_fee', 'payment_gateway', 'available_gateways',
            'decimal_places', 'thousand_separator', 'decimal_separator',
            'symbol_position', 'symbol_space', 'date_format'
        ];
    END IF;
    
    -- Update target country with selected fields
    UPDATE public.country_settings
    SET
        sales_tax = CASE WHEN 'sales_tax' = ANY(p_fields) THEN v_from_record.sales_tax ELSE sales_tax END,
        vat = CASE WHEN 'vat' = ANY(p_fields) THEN v_from_record.vat ELSE vat END,
        min_shipping = CASE WHEN 'min_shipping' = ANY(p_fields) THEN v_from_record.min_shipping ELSE min_shipping END,
        additional_shipping = CASE WHEN 'additional_shipping' = ANY(p_fields) THEN v_from_record.additional_shipping ELSE additional_shipping END,
        weight_unit = CASE WHEN 'weight_unit' = ANY(p_fields) THEN v_from_record.weight_unit ELSE weight_unit END,
        volumetric_divisor = CASE WHEN 'volumetric_divisor' = ANY(p_fields) THEN v_from_record.volumetric_divisor ELSE volumetric_divisor END,
        payment_gateway_fixed_fee = CASE WHEN 'payment_gateway_fixed_fee' = ANY(p_fields) THEN v_from_record.payment_gateway_fixed_fee ELSE payment_gateway_fixed_fee END,
        payment_gateway_percent_fee = CASE WHEN 'payment_gateway_percent_fee' = ANY(p_fields) THEN v_from_record.payment_gateway_percent_fee ELSE payment_gateway_percent_fee END,
        payment_gateway = CASE WHEN 'payment_gateway' = ANY(p_fields) THEN v_from_record.payment_gateway ELSE payment_gateway END,
        available_gateways = CASE WHEN 'available_gateways' = ANY(p_fields) THEN v_from_record.available_gateways ELSE available_gateways END,
        decimal_places = CASE WHEN 'decimal_places' = ANY(p_fields) THEN v_from_record.decimal_places ELSE decimal_places END,
        thousand_separator = CASE WHEN 'thousand_separator' = ANY(p_fields) THEN v_from_record.thousand_separator ELSE thousand_separator END,
        decimal_separator = CASE WHEN 'decimal_separator' = ANY(p_fields) THEN v_from_record.decimal_separator ELSE decimal_separator END,
        symbol_position = CASE WHEN 'symbol_position' = ANY(p_fields) THEN v_from_record.symbol_position ELSE symbol_position END,
        symbol_space = CASE WHEN 'symbol_space' = ANY(p_fields) THEN v_from_record.symbol_space ELSE symbol_space END,
        date_format = CASE WHEN 'date_format' = ANY(p_fields) THEN v_from_record.date_format ELSE date_format END,
        updated_at = now()
    WHERE code = p_to_country;
    
    RETURN FOUND;
END;
$$;