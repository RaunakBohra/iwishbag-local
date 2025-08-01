#!/bin/bash

echo "📧 Sending test email to rnkbohra@gmail.com..."

# Get your production Supabase details
echo "Enter your production Supabase URL (e.g., https://xxx.supabase.co):"
read SUPABASE_URL

echo "Enter your production Supabase anon key:"
read SUPABASE_ANON_KEY

# Send the email
curl -X POST "$SUPABASE_URL/functions/v1/send-email-ses" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "rnkbohra@gmail.com",
    "subject": "Test Email from iWishBag AWS SES",
    "html": "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\"><h1 style=\"color: #28a745;\">🎉 AWS SES is Working!</h1><p>Hi Raunak,</p><p>This is a test email from your AWS SES setup for iWishBag.</p><ul><li><strong>From:</strong> noreply@mail.iwishbag.com</li><li><strong>Provider:</strong> AWS SES</li><li><strong>Time:</strong> '"$(date)"'</li></ul><p style=\"background: #f0f0f0; padding: 15px; border-radius: 5px;\">If you received this email, your SES configuration is working correctly! 🚀</p><hr style=\"margin: 20px 0; border: none; border-top: 1px solid #eee;\"><p style=\"color: #666; font-size: 14px;\">This is an automated test email. No action required.</p></div>",
    "text": "AWS SES Test - This is a test email from your AWS SES setup. If you received this, it is working correctly!",
    "from": "iWishBag <noreply@mail.iwishbag.com>",
    "replyTo": "support@iwishbag.com"
  }' | jq

echo -e "\n✅ Check your email at rnkbohra@gmail.com"