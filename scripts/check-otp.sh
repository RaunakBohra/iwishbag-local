#!/bin/bash

# Check OTP for a given phone number
# Usage: ./check-otp.sh "+9779803939607"

PHONE="${1:-+9779803939607}"

echo "📱 Checking OTP for phone: $PHONE"
echo "================================"

PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -t -c "
SELECT 
    '🔐 OTP: ' || substring(convert_from(decode(otp_hash, 'base64'), 'UTF8'), 1, 6) || 
    ' (expires in ' || 
    EXTRACT(MINUTE FROM (expires_at - NOW())) || ' minutes)'
FROM phone_otps 
WHERE phone = '$PHONE' 
  AND expires_at > NOW()
  AND used_at IS NULL
ORDER BY created_at DESC 
LIMIT 1;
" | grep -v "^$"

echo "================================"
echo "✅ Use this OTP in the verification form"