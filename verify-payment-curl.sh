#!/bin/bash

# Call payment-verification endpoint to update database
curl -X POST https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/payment-verification \
  -H "Authorization: Bearer YOUR_ANON_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_id": "pi_3RlBRmQj80XSacOA1djAv9ND",
    "gateway": "stripe",
    "amount": 1063.81,
    "currency": "USD"
  }'