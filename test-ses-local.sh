#!/bin/bash

echo "📧 Testing AWS SES locally..."

# Using service role key for local testing
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Create JSON payload
cat > /tmp/ses-test-payload.json << 'EOF'
{
  "to": "rnkbohra@gmail.com",
  "subject": "Test Email from AWS SES - iwishBag Local",
  "html": "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'><h1 style='color: #28a745;'>🎉 AWS SES is Working!</h1><p>Hi Raunak,</p><p>This is a test email from your AWS SES setup running locally.</p><ul><li><strong>From:</strong> noreply@mail.iwishbag.com</li><li><strong>Provider:</strong> AWS SES</li><li><strong>Environment:</strong> Local Development</li><li><strong>Time:</strong> {{TIME}}</li></ul><p style='background: #f0f0f0; padding: 15px; border-radius: 5px;'>If you received this email, your SES configuration is working correctly! 🚀</p></div>",
  "text": "Test email from AWS SES. If you received this, it's working!",
  "from": "iWishBag <noreply@mail.iwishbag.com>",
  "replyTo": "support@iwishbag.com"
}
EOF

# Replace timestamp
sed -i '' "s/{{TIME}}/$(date)/g" /tmp/ses-test-payload.json

# Send the request
echo "Sending email..."
curl -X POST http://127.0.0.1:54321/functions/v1/send-email-ses \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/ses-test-payload.json | jq

echo -e "\n✅ Check your email at rnkbohra@gmail.com"

# Clean up
rm -f /tmp/ses-test-payload.json