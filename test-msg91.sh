#!/bin/bash

# MSG91 Test Script
echo "🧪 Testing MSG91 SMS API..."

AUTH_KEY="460963AgTvXkszpK688b31a4P1"
SENDER="IWISH"
PHONE="9971093202"  # Without country code
MESSAGE="Test SMS from iwishBag"

echo "📱 Sending to: +91${PHONE}"
echo "📝 Message: ${MESSAGE}"

# Test using simple GET API
echo -e "\n1️⃣ Testing sendhttp.php API (GET)..."
ENCODED_MESSAGE=$(echo -n "${MESSAGE}" | sed 's/ /%20/g')
curl "https://control.msg91.com/api/sendhttp.php?authkey=${AUTH_KEY}&mobiles=${PHONE}&message=${ENCODED_MESSAGE}&sender=${SENDER}&route=4&country=91"

echo -e "\n\n2️⃣ Testing v5 SMS API (POST)..."
curl -X POST "https://control.msg91.com/api/v5/sms" \
  -H "authkey: ${AUTH_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "'${SENDER}'",
    "route": "4",
    "country": "91",
    "sms": [
      {
        "message": "'${MESSAGE}'",
        "to": ["'${PHONE}'"]
      }
    ]
  }' -v

echo -e "\n\n✅ Test complete! Check the responses above."