-- Fix RLS policies for route_customs_tiers table

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can manage customs tiers" ON route_customs_tiers;

-- Create admin policy using has_role function
CREATE POLICY "Admin can manage customs tiers" ON route_customs_tiers
    FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Add read policy for authenticated users (for suggestions)
CREATE POLICY "Authenticated users can read customs tiers" ON route_customs_tiers
    FOR SELECT USING (auth.role() = 'authenticated');

-- Verify data exists
DO $$
BEGIN
    RAISE NOTICE 'Checking customs tiers data...';
    RAISE NOTICE 'Total tiers: %', (SELECT COUNT(*) FROM route_customs_tiers);
    RAISE NOTICE 'US to India tiers: %', (SELECT COUNT(*) FROM route_customs_tiers WHERE origin_country = 'US' AND destination_country = 'IN');
END $$; 