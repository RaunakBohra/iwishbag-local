-- Check current state of bank accounts
SELECT id, bank_name, currency_code, destination_country, is_fallback, is_active 
FROM bank_account_details 
ORDER BY currency_code, created_at;

-- Set existing accounts without destination_country as fallback accounts
UPDATE bank_account_details 
SET is_fallback = true 
WHERE destination_country IS NULL;

-- Ensure we don't have multiple active accounts for the same currency without proper differentiation
-- This query will show if there are duplicates
SELECT currency_code, COUNT(*) as count 
FROM bank_account_details 
WHERE is_active = true 
GROUP BY currency_code 
HAVING COUNT(*) > 1;