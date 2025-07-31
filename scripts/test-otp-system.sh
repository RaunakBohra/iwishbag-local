#!/bin/bash

# Test OTP System
echo "🧪 Testing OTP System..."
echo "========================"

# Function to test SMS sending
test_sms() {
    local phone=$1
    local provider_name=$2
    
    echo ""
    echo "📱 Testing ${provider_name} with phone: ${phone}"
    echo "----------------------------------------"
    
    # Send OTP request
    response=$(curl -s -X POST \
        http://localhost:54321/functions/v1/auth-sms-hook \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
        -d "{
            \"phone\": \"${phone}\",
            \"type\": \"phone_change\",
            \"user_id\": \"test-user-id\"
        }")
    
    echo "Response: ${response}"
    
    # Check if successful
    if echo "$response" | grep -q '"success":true'; then
        echo "✅ SMS sent successfully!"
        
        # Extract provider from response
        provider=$(echo "$response" | grep -o '"provider":"[^"]*"' | cut -d'"' -f4)
        echo "📦 Provider used: ${provider}"
    else
        echo "❌ Failed to send SMS"
    fi
}

# Test different phone numbers
echo "1️⃣ Testing Indian number (should use MSG91):"
test_sms "+919971093202" "MSG91"

echo ""
echo "2️⃣ Testing US number (should use Twilio):"
test_sms "+14155552671" "Twilio"

echo ""
echo "3️⃣ Testing Nepal number (should use Twilio for now):"
test_sms "+9779812345678" "Twilio"

echo ""
echo "📊 Checking OTP storage in database:"
echo "----------------------------------------"

# Check if OTPs were stored
PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -c "
SELECT 
    phone,
    created_at,
    expires_at,
    CASE 
        WHEN expires_at > NOW() THEN 'Valid'
        ELSE 'Expired'
    END as status
FROM phone_otps
ORDER BY created_at DESC
LIMIT 5;
"

echo ""
echo "✅ OTP System Test Complete!"
echo ""
echo "💡 Tips:"
echo "   - Check Supabase logs: supabase functions logs auth-sms-hook"
echo "   - View SMS logs: ./scripts/view-sms-logs.sh"
echo "   - Check specific OTP: ./scripts/check-otp.sh <phone>"