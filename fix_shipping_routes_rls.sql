-- Fix RLS policies for shipping_routes table
-- Run this script to fix the "new row violates row-level security policy" error

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can manage shipping routes" ON shipping_routes;
DROP POLICY IF EXISTS "Public can read active shipping routes" ON shipping_routes;

-- Create correct admin policy using has_role function
CREATE POLICY "Admin can manage shipping routes" ON shipping_routes
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create public read policy for active routes
CREATE POLICY "Public can read active shipping routes" ON shipping_routes
  FOR SELECT USING (is_active = true);

-- Grant necessary permissions to authenticated users (for admin access)
GRANT ALL ON shipping_routes TO authenticated;
GRANT USAGE ON SEQUENCE shipping_routes_id_seq TO authenticated; 