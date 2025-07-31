#!/bin/bash

# Watch SMS Edge Function logs in real-time

echo "📱 Watching SMS Edge Function logs..."
echo "================================"
echo "To test, try changing a phone number in the app"
echo "Press Ctrl+C to stop"
echo "================================"
echo ""

# Start watching the Edge Functions output
npx supabase functions serve 2>&1 | grep -E "(SMS AUTH HOOK|OTP:|Message:|Twilio|MSG91|TEST MODE|Error)" --line-buffered