# 📱 SMS Testing Guide for Multi-Provider Routing

## ✅ Prerequisites
- Local Supabase running (`npm run supabase:start`)
- Environment variables configured in both:
  - Local: `supabase/config.toml`
  - Cloud: Supabase Dashboard → Edge Functions → Environment Variables

## 🧪 Test Scenarios

### 1. **Test Indian Number (+91) → MSG91**
```bash
# Test with your Indian number
curl -X POST http://127.0.0.1:54321/functions/v1/auth-sms-hook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -d '{
    "phone": "+919971093202",
    "type": "phone_change"
  }'
```

Expected: SMS sent via MSG91 (check response for `"provider": "MSG91"`)

### 2. **Test Nepal Number (+977) → Twilio**
```bash
# Test with your Nepal number
curl -X POST http://127.0.0.1:54321/functions/v1/auth-sms-hook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -d '{
    "phone": "+9779492622611",
    "type": "phone_change"
  }'
```

Expected: SMS sent via Twilio (check response for `"provider": "Twilio"`)

### 3. **Test US Number (+1) → Twilio**
```bash
# Test with a US number
curl -X POST http://127.0.0.1:54321/functions/v1/auth-sms-hook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -d '{
    "phone": "+12125551234",
    "type": "phone_change"
  }'
```

Expected: SMS sent via Twilio (check response for `"provider": "Twilio"`)

## 🔍 Check Edge Function Logs

```bash
# View Edge Function logs in real-time
npm run supabase:functions:serve
```

Look for these log patterns:
- `📱 Routing SMS for +91****3202 to country: IN` (India → MSG91)
- `📱 Routing SMS for +977****2611 to country: NP` (Nepal → Twilio)
- `📱 Routing SMS for +1****1234 to country: OTHER` (US → Twilio)

## 🎯 Test via UI

1. Go to Profile page: http://localhost:8082/profile
2. Click "Change Phone Number" button
3. Enter new phone number:
   - India: +91 9971093202 (will use MSG91)
   - Nepal: +977 9492622611 (will use Twilio)
   - Other: Any US/UK number (will use Twilio)
4. Click "Send OTP"
5. Check your phone for the OTP
6. Enter the OTP and confirm

## 📊 Success Indicators

✅ **Successful Response:**
```json
{
  "success": true,
  "phone": "+91****3202",
  "provider": "MSG91",  // or "Twilio"
  "expires_at": "2025-01-31T15:30:00.000Z",
  "type": "phone_change"
}
```

❌ **Common Errors:**

1. **MSG91 Error** (India numbers):
   - Check MSG91_AUTH_KEY is set correctly
   - Verify MSG91 account has SMS credits
   - Check if IP whitelisting is needed

2. **Twilio Error** (Nepal/Other numbers):
   - Verify Twilio credentials are correct
   - Check if phone number is verified in Twilio (for trial accounts)
   - Ensure Twilio account has balance

## 🚀 Production Deployment

Once testing is successful:

1. Deploy Edge Functions to production:
```bash
npm run supabase:functions:deploy auth-sms-hook
npm run supabase:functions:deploy verify-sms-otp
```

2. Test in production with same test cases

## 🛠️ Troubleshooting

### MSG91 IP Whitelisting
If you need to enable IP security later, add these Supabase Edge Function IPs:
- `0.0.0.0/0` (Allow all - less secure)
- Or specific Supabase IP ranges (contact Supabase support for current IPs)

### Check Database for OTPs
```sql
-- View recent OTPs (local Supabase Studio)
SELECT 
  phone,
  created_at,
  expires_at,
  used_at
FROM phone_otps
ORDER BY created_at DESC
LIMIT 10;
```

### Clear Test OTPs
```sql
-- Clean up test OTPs older than 1 hour
DELETE FROM phone_otps 
WHERE created_at < NOW() - INTERVAL '1 hour';
```