-- Add description column to payment_gateways table
-- This fixes the schema mismatch between the table definition and seed data

ALTER TABLE public.payment_gateways
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment to document the change
COMMENT ON COLUMN public.payment_gateways.description IS 'Description of the payment gateway for display purposes'; 