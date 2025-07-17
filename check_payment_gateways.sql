-- Check existing payment gateways
SELECT code, name, is_active, supported_currencies, config FROM payment_gateways ORDER BY priority;