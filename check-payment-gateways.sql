-- Check existing payment gateways
SELECT id, name, code, enabled, supported_currencies, priority 
FROM payment_gateways 
ORDER BY priority;