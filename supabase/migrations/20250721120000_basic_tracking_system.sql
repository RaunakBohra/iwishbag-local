-- Migration: Basic iwishBag Internal Tracking System
-- Adds minimal tracking functionality with iwishBag tracking IDs
-- Created: 2025-07-21

-- Add basic tracking fields to quotes table
ALTER TABLE quotes 
  ADD COLUMN IF NOT EXISTS iwish_tracking_id VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS tracking_status VARCHAR(30) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_iwish_tracking_id ON quotes(iwish_tracking_id);
CREATE INDEX IF NOT EXISTS idx_quotes_tracking_status ON quotes(tracking_status);

-- Create sequence for iwishBag tracking ID generation
CREATE SEQUENCE IF NOT EXISTS iwish_tracking_sequence START 1001 INCREMENT 1;

-- Grant permissions on the sequence
GRANT USAGE, SELECT ON SEQUENCE iwish_tracking_sequence TO anon;
GRANT USAGE, SELECT ON SEQUENCE iwish_tracking_sequence TO authenticated;
GRANT ALL ON SEQUENCE iwish_tracking_sequence TO service_role;

-- Function to generate iwishBag tracking IDs
CREATE OR REPLACE FUNCTION generate_iwish_tracking_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Generate format: IWB{YEAR}{SEQUENCE} → IWB20251001
  RETURN 'IWB' || EXTRACT(YEAR FROM NOW()) || LPAD(nextval('iwish_tracking_sequence')::TEXT, 4, '0');
END;
$$;

-- Grant permissions on the function
GRANT EXECUTE ON FUNCTION generate_iwish_tracking_id() TO anon;
GRANT EXECUTE ON FUNCTION generate_iwish_tracking_id() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_iwish_tracking_id() TO service_role;

-- Add comments for documentation
COMMENT ON COLUMN quotes.iwish_tracking_id IS 'iwishBag internal tracking ID (format: IWB20251001)';
COMMENT ON COLUMN quotes.tracking_status IS 'Current tracking status (pending, preparing, shipped, delivered, exception)';
COMMENT ON COLUMN quotes.estimated_delivery_date IS 'Expected delivery date set by admin';
COMMENT ON FUNCTION generate_iwish_tracking_id() IS 'Generates iwishBag tracking IDs in format IWB{YEAR}{SEQUENCE}';
COMMENT ON SEQUENCE iwish_tracking_sequence IS 'Sequential numbering for iwishBag tracking IDs starting at 1001';

-- Test the function works (this will be rolled back in transaction)
DO $$
DECLARE
    test_id TEXT;
BEGIN
    test_id := generate_iwish_tracking_id();
    RAISE NOTICE 'Generated test tracking ID: %', test_id;
    
    -- Validate format
    IF test_id ~ '^IWB[0-9]{4}[0-9]{4}$' THEN
        RAISE NOTICE 'Tracking ID format validation: PASSED ✓';
    ELSE
        RAISE EXCEPTION 'Tracking ID format validation: FAILED ✗ (Expected IWB{YEAR}{SEQUENCE})';
    END IF;
END;
$$;