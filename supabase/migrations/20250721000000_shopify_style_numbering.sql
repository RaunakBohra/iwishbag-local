-- Migration: Implement Shopify-style clean numbering (#1001, #1002, #1003...)
-- Removes old complex Q20250721-abc123 format in favor of simple sequential numbering
-- Created: 2025-07-21

-- Create sequence for unified quote/order numbering starting at 1001
CREATE SEQUENCE IF NOT EXISTS public.quote_display_sequence 
  START WITH 1001 
  INCREMENT BY 1 
  NO MAXVALUE 
  NO MINVALUE 
  CACHE 1;

-- Grant permissions on the sequence
GRANT USAGE, SELECT ON SEQUENCE public.quote_display_sequence TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.quote_display_sequence TO authenticated;
GRANT ALL ON SEQUENCE public.quote_display_sequence TO service_role;

-- Replace the old complex function with simple sequential numbering
CREATE OR REPLACE FUNCTION public.generate_display_id() 
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate if display_id is null (new record)
  IF NEW.display_id IS NULL THEN
    -- Generate simple format: #1001, #1002, #1003...
    NEW.display_id := '#' || nextval('public.quote_display_sequence');
  END IF;
  RETURN NEW;
END;
$$;

-- Update function ownership and permissions
ALTER FUNCTION public.generate_display_id() OWNER TO postgres;
GRANT ALL ON FUNCTION public.generate_display_id() TO anon;
GRANT ALL ON FUNCTION public.generate_display_id() TO authenticated;
GRANT ALL ON FUNCTION public.generate_display_id() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION public.generate_display_id() IS 'Generates Shopify-style sequential display IDs (#1001, #1002, etc.) for quotes/orders';
COMMENT ON SEQUENCE public.quote_display_sequence IS 'Sequential numbering for quote/order display IDs starting at 1001';