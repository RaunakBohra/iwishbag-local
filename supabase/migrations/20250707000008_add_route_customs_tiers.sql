-- Create route_customs_tiers table for tiered customs rules
CREATE TABLE route_customs_tiers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    origin_country TEXT NOT NULL,
    destination_country TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    weight_min DECIMAL(8,3),
    weight_max DECIMAL(8,3),
    logic_type TEXT NOT NULL CHECK (logic_type IN ('AND', 'OR')),
    customs_percentage DECIMAL(5,2) NOT NULL,
    vat_percentage DECIMAL(5,2) NOT NULL,
    priority_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient route-based queries
CREATE INDEX idx_route_customs_tiers_route ON route_customs_tiers(origin_country, destination_country);

-- Create index for priority ordering
CREATE INDEX idx_route_customs_tiers_priority ON route_customs_tiers(origin_country, destination_country, priority_order);

-- Create index for price range queries
CREATE INDEX idx_route_customs_tiers_price ON route_customs_tiers(origin_country, destination_country, price_min, price_max);

-- Create index for weight range queries
CREATE INDEX idx_route_customs_tiers_weight ON route_customs_tiers(origin_country, destination_country, weight_min, weight_max);

-- Add RLS policies
ALTER TABLE route_customs_tiers ENABLE ROW LEVEL SECURITY;

-- Admin can manage all customs tiers
CREATE POLICY "Admin can manage customs tiers" ON route_customs_tiers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Insert some sample data for testing
INSERT INTO route_customs_tiers (
    origin_country, 
    destination_country, 
    rule_name, 
    price_min, 
    price_max, 
    weight_min, 
    weight_max, 
    logic_type, 
    customs_percentage, 
    vat_percentage, 
    priority_order, 
    description
) VALUES 
-- US to India rules
('US', 'IN', 'Low Value Items', 0, 100, 0, 1, 'AND', 5.00, 18.00, 1, 'Low value items under $100 and 1kg'),
('US', 'IN', 'Medium Value Items', 100, 500, 1, 5, 'OR', 10.00, 18.00, 2, 'Medium value items $100-500 OR 1-5kg'),
('US', 'IN', 'High Value Items', 500, NULL, 5, NULL, 'AND', 15.00, 18.00, 3, 'High value items over $500 and 5kg'),

-- China to India rules
('CN', 'IN', 'Low Value Items', 0, 50, 0, 0.5, 'AND', 3.00, 18.00, 1, 'Low value items under $50 and 0.5kg'),
('CN', 'IN', 'Medium Value Items', 50, 200, 0.5, 2, 'OR', 8.00, 18.00, 2, 'Medium value items $50-200 OR 0.5-2kg'),
('CN', 'IN', 'High Value Items', 200, NULL, 2, NULL, 'AND', 12.00, 18.00, 3, 'High value items over $200 and 2kg'),

-- UK to India rules
('GB', 'IN', 'Low Value Items', 0, 75, 0, 1, 'AND', 6.00, 18.00, 1, 'Low value items under £75 and 1kg'),
('GB', 'IN', 'Medium Value Items', 75, 300, 1, 3, 'OR', 11.00, 18.00, 2, 'Medium value items £75-300 OR 1-3kg'),
('GB', 'IN', 'High Value Items', 300, NULL, 3, NULL, 'AND', 16.00, 18.00, 3, 'High value items over £300 and 3kg');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_route_customs_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_route_customs_tiers_updated_at
    BEFORE UPDATE ON route_customs_tiers
    FOR EACH ROW
    EXECUTE FUNCTION update_route_customs_tiers_updated_at(); 