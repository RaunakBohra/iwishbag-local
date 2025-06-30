-- Add route-specific customs tiers
CREATE TABLE IF NOT EXISTS route_customs_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  shipping_route_id UUID REFERENCES shipping_routes(id) ON DELETE CASCADE,
  min_price DECIMAL(10,2) NOT NULL,
  max_price DECIMAL(10,2),
  min_weight DECIMAL(10,2) NOT NULL,
  max_weight DECIMAL(10,2),
  customs_percentage DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE route_customs_tiers ENABLE ROW LEVEL SECURITY;

-- Admin can manage all tiers
CREATE POLICY "Admin can manage route customs tiers" ON route_customs_tiers
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Users can view tiers for their routes (admin only)
CREATE POLICY "Users can view route customs tiers" ON route_customs_tiers
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Change quotes.status to TEXT before updating values
ALTER TABLE quotes ALTER COLUMN status TYPE TEXT USING status::text;

-- Update existing quotes with old statuses to use new simplified status system
UPDATE quotes 
SET status = CASE 
  WHEN status = 'calculated' THEN 'pending'
  WHEN status = 'accepted' THEN 'approved'
  WHEN status = 'cod_pending' THEN 'paid'
  WHEN status = 'bank_transfer_pending' THEN 'paid'
  ELSE status
END
WHERE status IN ('calculated', 'accepted', 'cod_pending', 'bank_transfer_pending'); 