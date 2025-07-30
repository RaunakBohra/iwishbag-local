-- Update get_effective_tax_method function to remove HSN references
-- This simplifies the function to use manual/country-based methods with fallbacks

CREATE OR REPLACE FUNCTION public.get_effective_tax_method(quote_id_param uuid) 
RETURNS TABLE(calculation_method text, valuation_method text, source text, confidence numeric)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    quote_record quotes%ROWTYPE;
BEGIN
    -- Get quote details
    SELECT * INTO quote_record FROM quotes WHERE id = quote_id_param;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'manual'::text, 'auto'::text, 'not_found'::text, 0.0::numeric;
        RETURN;
    END IF;
    
    -- Check for per-quote preferences first
    IF quote_record.calculation_method_preference != 'auto' THEN
        RETURN QUERY SELECT 
            quote_record.calculation_method_preference,
            quote_record.valuation_method_preference,
            'quote_specific'::text,
            1.0::numeric;
        RETURN;
    END IF;
    
    -- Use manual calculation as the default (simplified approach)
    -- This allows users to set customs rates manually or use route-based calculations
    RETURN QUERY SELECT 'manual'::text, 'auto'::text, 'system_default'::text, 0.8::numeric;
END;
$$;