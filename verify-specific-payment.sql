-- Check if this specific payment is recorded
SELECT * FROM payment_transactions 
WHERE transaction_id = 'pi_3RlBRmQj80XSacOA1djAv9ND'
   OR gateway_transaction_id = 'pi_3RlBRmQj80XSacOA1djAv9ND';

-- Check payment_ledger for this payment
SELECT * FROM payment_ledger 
WHERE reference_id = 'pi_3RlBRmQj80XSacOA1djAv9ND'
   OR transaction_id = 'pi_3RlBRmQj80XSacOA1djAv9ND';

-- Check if the quote status was updated
SELECT id, status, payment_status, payment_method, final_total, final_currency, updated_at
FROM quotes 
WHERE id = '974397df-e02b-48f3-a091-b5edd44fd35c';

-- Check payments table if it exists
SELECT * FROM payments
WHERE transaction_id = 'pi_3RlBRmQj80XSacOA1djAv9ND'
   OR gateway_transaction_id = 'pi_3RlBRmQj80XSacOA1djAv9ND'
LIMIT 1;