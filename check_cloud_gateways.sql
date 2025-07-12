-- Check payment gateways in cloud
SELECT code, name, is_active, 
       array_length(supported_countries, 1) as countries,
       array_length(supported_currencies, 1) as currencies,
       supported_currencies
FROM payment_gateways 
WHERE is_active = true
ORDER BY code;
