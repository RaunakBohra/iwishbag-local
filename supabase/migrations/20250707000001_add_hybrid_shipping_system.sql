-- Migration: Add Hybrid Shipping Cost System
-- Date: 2025-07-06
-- Description: Implements dynamic shipping costs based on origin-destination combinations

-- Origin-Destination shipping routes
CREATE TABLE shipping_routes (
  id SERIAL PRIMARY KEY,
  origin_country VARCHAR(3) NOT NULL,
  destination_country VARCHAR(3) NOT NULL,
  
  -- Base shipping costs
  base_shipping_cost DECIMAL(10,2) NOT NULL,
  cost_per_kg DECIMAL(10,2) NOT NULL,
  cost_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Weight tiers (JSONB for flexibility)
  weight_tiers JSONB DEFAULT '[
    {"min": 0, "max": 1, "cost": 15.00},
    {"min": 1, "max": 3, "cost": 25.00},
    {"min": 3, "max": 5, "cost": 35.00},
    {"min": 5, "max": null, "cost": 45.00}
  ]',
  
  -- Carrier options
  carriers JSONB DEFAULT '[
    {"name": "DHL", "cost_multiplier": 1.0, "days": "3-5"},
    {"name": "FedEx", "cost_multiplier": 0.9, "days": "5-7"},
    {"name": "USPS", "cost_multiplier": 0.7, "days": "7-14"}
  ]',
  
  -- Restrictions
  max_weight DECIMAL(8,2),
  restricted_items TEXT[],
  requires_documentation BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(origin_country, destination_country)
);

-- Create indexes for performance
CREATE INDEX idx_shipping_routes_origin ON shipping_routes(origin_country);
CREATE INDEX idx_shipping_routes_destination ON shipping_routes(destination_country);
CREATE INDEX idx_shipping_routes_active ON shipping_routes(is_active);

-- Add RLS policies for shipping_routes
ALTER TABLE shipping_routes ENABLE ROW LEVEL SECURITY;

-- Admin can read/write all shipping routes
CREATE POLICY "Admin can manage shipping routes" ON shipping_routes
  FOR ALL USING (auth.role() = 'admin');

-- Public can read active shipping routes
CREATE POLICY "Public can read active shipping routes" ON shipping_routes
  FOR SELECT USING (is_active = true);

-- Insert some default shipping routes for common origin-destination combinations
INSERT INTO shipping_routes (origin_country, destination_country, base_shipping_cost, cost_per_kg, cost_percentage) VALUES
-- US to various destinations
('US', 'CA', 25.00, 8.00, 2.5),
('US', 'UK', 35.00, 12.00, 3.0),
('US', 'AU', 45.00, 15.00, 3.5),
('US', 'DE', 32.00, 11.00, 2.8),
('US', 'FR', 33.00, 11.50, 2.9),
('US', 'JP', 40.00, 14.00, 3.2),
('US', 'IN', 30.00, 10.00, 2.5),
('US', 'BR', 38.00, 13.00, 3.1),
('US', 'MX', 28.00, 9.00, 2.3),
('US', 'SG', 36.00, 12.50, 3.0),

-- UK to various destinations
('UK', 'US', 30.00, 10.00, 2.8),
('UK', 'CA', 28.00, 9.50, 2.6),
('UK', 'AU', 42.00, 14.00, 3.3),
('UK', 'DE', 15.00, 5.00, 1.5),
('UK', 'FR', 12.00, 4.00, 1.2),

-- AU to various destinations
('AU', 'US', 45.00, 15.00, 3.5),
('AU', 'UK', 42.00, 14.00, 3.3),
('AU', 'CA', 40.00, 13.50, 3.2),
('AU', 'NZ', 25.00, 8.00, 2.0),

-- DE to various destinations
('DE', 'US', 32.00, 11.00, 2.8),
('DE', 'UK', 15.00, 5.00, 1.5),
('DE', 'FR', 8.00, 3.00, 1.0),
('DE', 'IT', 10.00, 3.50, 1.2);

-- Create function to get shipping cost for origin-destination
CREATE OR REPLACE FUNCTION get_shipping_cost(
  p_origin_country VARCHAR(3),
  p_destination_country VARCHAR(3),
  p_weight DECIMAL,
  p_price DECIMAL DEFAULT 0
)
RETURNS TABLE(
  cost DECIMAL(10,2),
  method TEXT,
  delivery_days TEXT,
  carrier TEXT
) AS $$
DECLARE
  route_record shipping_routes%ROWTYPE;
  weight_tier JSONB;
  tier_cost DECIMAL(10,2);
  base_cost DECIMAL(10,2);
  percentage_cost DECIMAL(10,2);
  final_cost DECIMAL(10,2);
BEGIN
  -- Try to get route-specific shipping cost
  SELECT * INTO route_record 
  FROM shipping_routes 
  WHERE origin_country = p_origin_country 
    AND destination_country = p_destination_country 
    AND is_active = true;
  
  IF FOUND THEN
    -- Use route-specific calculation
    base_cost := route_record.base_shipping_cost;
    
    -- Add weight-based cost
    base_cost := base_cost + (p_weight * route_record.cost_per_kg);
    
    -- Add percentage-based cost
    percentage_cost := (p_price * route_record.cost_percentage) / 100;
    
    -- Check weight tiers for additional adjustments
    FOR weight_tier IN SELECT * FROM jsonb_array_elements(route_record.weight_tiers)
    LOOP
      IF p_weight >= (weight_tier->>'min')::DECIMAL 
         AND (weight_tier->>'max' IS NULL OR p_weight <= (weight_tier->>'max')::DECIMAL) THEN
        tier_cost := (weight_tier->>'cost')::DECIMAL;
        base_cost := GREATEST(base_cost, tier_cost);
        EXIT;
      END IF;
    END LOOP;
    
    final_cost := base_cost + percentage_cost;
    
    -- Return with default carrier info
    RETURN QUERY SELECT 
      final_cost,
      'route-specific'::TEXT,
      '5-10'::TEXT,
      'DHL'::TEXT;
  ELSE
    -- Fallback to country settings (existing logic)
    -- This would need to be implemented based on your existing country_settings table
    RETURN QUERY SELECT 
      25.00::DECIMAL(10,2), -- Default fallback cost
      'default'::TEXT,
      '7-14'::TEXT,
      'Standard'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql; 