-- Test query to check if new bank account fields exist
SELECT 
  account_name,
  upi_id,
  payment_qr_url,
  instructions,
  upi_qr_string
FROM bank_account_details 
LIMIT 1;