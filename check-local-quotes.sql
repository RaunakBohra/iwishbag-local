-- Check for existing quotes in local database
SELECT 
  id,
  user_id,
  item_name,
  final_total,
  final_currency,
  status,
  created_at
FROM quotes
ORDER BY created_at DESC
LIMIT 10;