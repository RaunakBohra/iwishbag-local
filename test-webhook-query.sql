-- Check if webhooks are being received
SELECT * FROM webhook_logs 
WHERE webhook_type = 'airwallex' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check payment transactions
SELECT * FROM payment_transactions 
WHERE gateway = 'airwallex' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check quote status updates
SELECT id, status, final_total, currency, updated_at 
FROM quotes 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
ORDER BY updated_at DESC 
LIMIT 10;