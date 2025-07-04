-- Migration: Add Customer Notes to Quotes
-- Date: 2025-07-10
-- Description: Adds customer_notes field to quotes table for storing customer-provided notes

-- Add customer_notes column to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN quotes.customer_notes IS 'Notes provided by the customer during quote request (visible to both customer and admin)';

-- Add index for better performance when searching notes
CREATE INDEX IF NOT EXISTS idx_quotes_customer_notes ON quotes(customer_notes);

-- Update RLS policies to include the new column
DROP POLICY IF EXISTS "Users can view their own quotes" ON quotes;
CREATE POLICY "Users can view their own quotes" ON quotes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own quotes" ON quotes;
CREATE POLICY "Users can insert their own quotes" ON quotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own quotes" ON quotes;
CREATE POLICY "Users can update their own quotes" ON quotes
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies
DROP POLICY IF EXISTS "Admins can view all quotes" ON quotes;
CREATE POLICY "Admins can view all quotes" ON quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all quotes" ON quotes;
CREATE POLICY "Admins can update all quotes" ON quotes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert quotes" ON quotes;
CREATE POLICY "Admins can insert quotes" ON quotes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  ); 