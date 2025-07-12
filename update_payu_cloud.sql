-- Update PayU configuration in cloud database
UPDATE payment_gateways SET 
  config = jsonb_build_object(
    'salt_key', 'VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe',
    'environment', 'test',
    'merchant_id', '8725115',
    'merchant_key', 'u7Ui5I',
    'success_url', '/payment/success',
    'failure_url', '/payment/failure',
    'webhook_url', '/functions/v1/payment-webhook'
  )
WHERE code = 'payu';

-- Verify the update
SELECT code, name, config FROM payment_gateways WHERE code = 'payu';