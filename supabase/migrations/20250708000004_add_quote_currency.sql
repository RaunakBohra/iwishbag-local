-- Add quote_currency column to quotes table
ALTER TABLE quotes ADD COLUMN quote_currency TEXT DEFAULT 'USD';

-- Update existing quotes to have USD as default quote currency
UPDATE quotes SET quote_currency = 'USD' WHERE quote_currency IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE quotes ALTER COLUMN quote_currency SET NOT NULL;

-- Add index for better performance
CREATE INDEX idx_quotes_quote_currency ON quotes(quote_currency); 