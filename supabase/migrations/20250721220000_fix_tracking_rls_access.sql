-- Fix RLS policies to allow public tracking access
-- The tracking system needs to be accessible to anonymous users

-- Add RLS policy to allow public access for tracking lookups
-- This allows anyone to look up quotes by iwish_tracking_id (public tracking)
CREATE POLICY "Allow public tracking lookup by iwish_tracking_id" 
ON quotes FOR SELECT
USING (iwish_tracking_id IS NOT NULL);

-- Also allow anonymous users to access quotes with tracking IDs
-- This ensures the customer tracking page works for anonymous users
CREATE POLICY "Allow anonymous access to quotes with tracking IDs"
ON quotes FOR SELECT  
TO anon
USING (iwish_tracking_id IS NOT NULL);

-- Add comment for documentation
COMMENT ON POLICY "Allow public tracking lookup by iwish_tracking_id" ON quotes 
IS 'Enables public customer tracking page access by iwish_tracking_id';

COMMENT ON POLICY "Allow anonymous access to quotes with tracking IDs" ON quotes
IS 'Allows anonymous users to track orders using iwishBag tracking IDs';