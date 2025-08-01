#!/bin/bash

echo "📧 Testing Email Pipeline End-to-End"
echo "===================================="
echo ""

# Step 1: Check ngrok tunnel is active
echo "🔗 Checking ngrok tunnel..."
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null)
if [ "$NGROK_URL" == "null" ] || [ -z "$NGROK_URL" ]; then
    echo "❌ Ngrok tunnel not active!"
    exit 1
else
    echo "✅ Ngrok tunnel active: $NGROK_URL"
fi

# Step 2: Check Lambda configuration
echo "🔧 Checking Lambda configuration..."
LAMBDA_URL=$(aws lambda get-function-configuration --function-name iwishbag-process-incoming-email --query 'Environment.Variables.SUPABASE_URL' --output text)
if [ "$LAMBDA_URL" == "$NGROK_URL" ]; then
    echo "✅ Lambda correctly configured with ngrok URL"
else
    echo "❌ Lambda URL mismatch: $LAMBDA_URL vs $NGROK_URL"
fi

# Step 3: Test ngrok connectivity to local Supabase
echo "🧪 Testing ngrok connectivity to local Supabase..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$NGROK_URL/rest/v1/")
if [ "$HTTP_STATUS" == "200" ]; then
    echo "✅ Ngrok tunnel can reach local Supabase"
else
    echo "❌ Ngrok tunnel test failed (HTTP $HTTP_STATUS)"
fi

# Step 4: Count current emails in database
echo "📊 Current emails in local database:"
CURRENT_COUNT=$(PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -t -c "SELECT COUNT(*) FROM email_messages;" | xargs)
echo "   Total emails: $CURRENT_COUNT"

CURRENT_RECEIVED=$(PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -t -c "SELECT COUNT(*) FROM email_messages WHERE direction = 'received';" | xargs)
echo "   Received emails: $CURRENT_RECEIVED"

echo ""
echo "🎯 READY FOR TESTING!"
echo ""
echo "📤 Now send an email to: support@mail.iwishbag.com"
echo "⏱️  Subject: Test Pipeline $(date +%H:%M:%S)"
echo ""
echo "⏳ After sending, press ENTER to check results..."
read -r

echo ""
echo "🔍 Checking for new emails..."

# Step 5: Check for new emails
NEW_COUNT=$(PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -t -c "SELECT COUNT(*) FROM email_messages;" | xargs)
NEW_RECEIVED=$(PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -t -c "SELECT COUNT(*) FROM email_messages WHERE direction = 'received';" | xargs)

echo "📊 Updated email counts:"
echo "   Total emails: $NEW_COUNT (was $CURRENT_COUNT)"
echo "   Received emails: $NEW_RECEIVED (was $CURRENT_RECEIVED)"

if [ "$NEW_RECEIVED" -gt "$CURRENT_RECEIVED" ]; then
    echo ""
    echo "🎉 SUCCESS! New email detected!"
    echo ""
    echo "📧 Most recent received emails:"
    PGPASSWORD=postgres psql -h localhost -p 54322 -d postgres -U postgres -c "SELECT direction, from_address, subject, created_at FROM email_messages WHERE direction = 'received' ORDER BY created_at DESC LIMIT 3;"
else
    echo ""
    echo "❌ No new email found. Let's check Lambda logs..."
    echo ""
    echo "🔍 Recent Lambda logs (last 2 minutes):"
    aws logs filter-log-events \
        --log-group-name /aws/lambda/iwishbag-process-incoming-email \
        --start-time $(date -u -v-2M +%s)000 \
        --limit 5 \
        --query 'events[*].message' \
        --output text | head -10
fi

echo ""
echo "✅ Test complete!"