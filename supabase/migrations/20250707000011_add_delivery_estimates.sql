-- Add delivery options, processing days, and active status to shipping routes
ALTER TABLE shipping_routes 
ADD COLUMN IF NOT EXISTS delivery_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS processing_days INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Add comment explaining the delivery_options structure
COMMENT ON COLUMN shipping_routes.delivery_options IS 'JSON array of delivery options with structure: [{"id": "string", "name": "string", "carrier": "string", "min_days": number, "max_days": number, "price": number, "active": boolean}]';

-- Add comment for processing days
COMMENT ON COLUMN shipping_routes.processing_days IS 'Number of business days for order processing before shipping';

-- Add comment for active
COMMENT ON COLUMN shipping_routes.active IS 'Whether the shipping route is active and available for quoting';

-- Create function to validate delivery options JSON structure
CREATE OR REPLACE FUNCTION validate_delivery_options()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if delivery_options is a valid JSON array
  IF NEW.delivery_options IS NOT NULL AND jsonb_typeof(NEW.delivery_options) != 'array' THEN
    RAISE EXCEPTION 'delivery_options must be a JSON array';
  END IF;
  
  -- Validate each delivery option structure
  IF NEW.delivery_options IS NOT NULL THEN
    FOR i IN 0..jsonb_array_length(NEW.delivery_options) - 1 LOOP
      DECLARE
        option jsonb := NEW.delivery_options->i;
      BEGIN
        -- Check required fields
        IF NOT (option ? 'id' AND option ? 'name' AND option ? 'carrier' AND 
                option ? 'min_days' AND option ? 'max_days' AND option ? 'price' AND option ? 'active') THEN
          RAISE EXCEPTION 'Delivery option at index % is missing required fields (id, name, carrier, min_days, max_days, price, active)', i;
        END IF;
        
        -- Validate data types
        IF jsonb_typeof(option->'id') != 'string' OR 
           jsonb_typeof(option->'name') != 'string' OR 
           jsonb_typeof(option->'carrier') != 'string' OR
           jsonb_typeof(option->'min_days') != 'number' OR
           jsonb_typeof(option->'max_days') != 'number' OR
           jsonb_typeof(option->'price') != 'number' OR
           jsonb_typeof(option->'active') != 'boolean' THEN
          RAISE EXCEPTION 'Delivery option at index % has invalid data types', i;
        END IF;
        
        -- Validate business logic
        IF (option->>'min_days')::int < 1 OR (option->>'max_days')::int < 1 THEN
          RAISE EXCEPTION 'Delivery option at index % has invalid days (must be >= 1)', i;
        END IF;
        
        IF (option->>'min_days')::int > (option->>'max_days')::int THEN
          RAISE EXCEPTION 'Delivery option at index % has min_days > max_days', i;
        END IF;
        
        IF (option->>'price')::numeric < 0 THEN
          RAISE EXCEPTION 'Delivery option at index % has negative price', i;
        END IF;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate delivery options
DROP TRIGGER IF EXISTS validate_delivery_options_trigger ON shipping_routes;
CREATE TRIGGER validate_delivery_options_trigger
  BEFORE INSERT OR UPDATE ON shipping_routes
  FOR EACH ROW
  EXECUTE FUNCTION validate_delivery_options();

-- Add RLS policies for delivery options
ALTER TABLE shipping_routes ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage delivery options
CREATE POLICY "Admins can manage delivery options" ON shipping_routes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Allow users to view delivery options for active routes
CREATE POLICY "Users can view delivery options for active routes" ON shipping_routes
  FOR SELECT USING (
    active = true AND 
    delivery_options IS NOT NULL AND 
    jsonb_array_length(delivery_options) > 0
  ); 