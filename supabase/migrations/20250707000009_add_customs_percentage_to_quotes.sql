-- Add customs_percentage column to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customs_percentage DECIMAL(5,2);

-- Add comment
COMMENT ON COLUMN quotes.customs_percentage IS 'Customs duty percentage for this quote (overrides category default)';

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
    FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all quotes" ON quotes;
CREATE POLICY "Admins can update all quotes" ON quotes
    FOR UPDATE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can insert quotes" ON quotes;
CREATE POLICY "Admins can insert quotes" ON quotes
    FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin')); 