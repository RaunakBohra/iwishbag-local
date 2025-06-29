-- Add enabled_delivery_options field to quotes table
ALTER TABLE quotes ADD COLUMN enabled_delivery_options JSONB DEFAULT '[]';

-- Add comment for documentation
COMMENT ON COLUMN quotes.enabled_delivery_options IS 'Array of delivery option IDs that are enabled for this specific quote. If empty, all options from shipping route are available.';

-- Update RLS policies to include the new column
DROP POLICY IF EXISTS "Users can view their own quotes" ON quotes;
CREATE POLICY "Users can view their own quotes" ON quotes
  FOR SELECT USING (auth.uid() = user_id);

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