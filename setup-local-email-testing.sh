#!/bin/bash

echo "🔗 Setting up local email testing with ngrok tunnel..."
echo "=================================================="
echo ""

# Start ngrok tunnel for local Supabase
echo "🚇 Starting ngrok tunnel for local Supabase (port 54321)..."
echo "This will expose your local Supabase to the internet temporarily."
echo ""

# Kill any existing ngrok processes
pkill -f ngrok 2>/dev/null || true

# Start ngrok in background
ngrok http 54321 --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
echo "⏳ Waiting for ngrok to initialize..."
sleep 5

# Get the public URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null)

if [ "$NGROK_URL" == "null" ] || [ -z "$NGROK_URL" ]; then
    echo "❌ Could not get ngrok URL. Checking logs..."
    cat /tmp/ngrok.log
    exit 1
fi

echo "✅ Ngrok tunnel created: $NGROK_URL"
echo ""

# Update Lambda environment variables
echo "📝 Updating Lambda to use ngrok tunnel..."
FUNCTION_NAME="iwishbag-process-incoming-email"

aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment "Variables={SUPABASE_URL=$NGROK_URL,SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZn7rRNF1TysDF0XVWN4Im8suicljBbdRdKs}" \
    > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Lambda configuration updated successfully!"
    echo ""
    echo "🎯 Your Lambda is now connected to local Supabase via:"
    echo "   $NGROK_URL"
    echo ""
    echo "📧 Now send a test email to support@mail.iwishbag.com"
    echo "💾 The email should appear in your local database and dashboard!"
    echo ""
    echo "⚠️  IMPORTANT: This tunnel will stay open until you stop it."
    echo "🛑 To stop the tunnel, run: kill $NGROK_PID"
    echo "🔒 Remember to update Lambda to production URL later!"
    echo ""
    echo "📊 Monitor ngrok traffic at: http://localhost:4040"
else
    echo "❌ Failed to update Lambda configuration"
    kill $NGROK_PID
    exit 1
fi

# Keep the script running to show the tunnel is active
echo "🔄 Tunnel is active. Press Ctrl+C to stop the tunnel and restore Lambda to localhost."
trap "echo ''; echo '🛑 Stopping tunnel and restoring Lambda...'; kill $NGROK_PID; aws lambda update-function-configuration --function-name $FUNCTION_NAME --environment 'Variables={SUPABASE_URL=http://127.0.0.1:54321,SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZn7rRNF1TysDF0XVWN4Im8suicljBbdRdKs}' > /dev/null; echo '✅ Lambda restored to localhost'; exit 0" INT

# Show tunnel status
while true; do
    sleep 30
    if ps -p $NGROK_PID > /dev/null; then
        echo "🟢 Tunnel still active: $NGROK_URL"
    else
        echo "❌ Tunnel died unexpectedly"
        break
    fi
done