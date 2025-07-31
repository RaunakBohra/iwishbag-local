# 🧪 Twilio Test Mode Guide

## Overview
Using Twilio test credentials allows you to test SMS functionality **WITHOUT ANY CHARGES**.

## Test Credentials (Currently Active)
```
Account SID: AC1576647b4cc3c76b9c41f6e4af197d18
Auth Token: 67580af0726c73fca9ec9184a14ff096
Test Phone: +15005550006
```

## How Twilio Test Mode Works

### ✅ What Works:
1. **API calls succeed** - Twilio returns success responses
2. **No charges** - Test credentials never incur costs
3. **Response structure** - Same as production
4. **Error testing** - Use special numbers to trigger errors

### ❌ What Doesn't Work:
1. **No actual SMS delivery** - Messages are NOT sent
2. **Test phone numbers only** - Limited to Twilio's magic numbers

## Magic Test Numbers

### From Numbers (Sender):
- `+15005550006` - Valid number (currently using)
- `+15005550001` - Invalid number (triggers error)
- `+15005550007` - Unavailable number
- `+15005550008` - SMS incapable number

### To Numbers (Recipient) - For Testing Scenarios:
- Any real number - Returns success but doesn't send
- `+15005550000` - Success response
- `+15005550001` - Invalid number error
- `+15005550002` - Cannot route to number
- `+15005550003` - International permissions error
- `+15005550004` - Blacklisted number
- `+15005550009` - SMS incapable number

## Testing Workflow

1. **Send OTP Request** → Success response
2. **Check Database** → OTP is stored
3. **Use check-otp.sh** → Get the OTP
4. **Enter OTP** → Verification works

## Check OTP During Testing

```bash
# Run this after requesting OTP
./scripts/check-otp.sh "+9779803939607"
```

## Switch to Production

When ready for production, update `.env`:
```bash
# Comment out test credentials
# TWILIO_ACCOUNT_SID=AC1576647b4cc3c76b9c41f6e4af197d18
# TWILIO_AUTH_TOKEN=67580af0726c73fca9ec9184a14ff096
# TWILIO_FROM_NUMBER=+15005550006

# Uncomment real credentials
TWILIO_ACCOUNT_SID=ACc41090d56e404b1fd081c3d1b438766f
TWILIO_AUTH_TOKEN=8ed6ae898c359a26ba1e97d3dbd9f9af
TWILIO_FROM_NUMBER=+17752888229
```

## Cost Savings
- Development testing: $0
- Production testing: ~$0.0079 per SMS
- Estimated savings: $50-100 during development

## Important Notes
1. **Test mode is perfect for development** - Full flow testing without costs
2. **Database still works** - OTPs are stored normally
3. **UI works normally** - Success/error responses are realistic
4. **Switch to production** - Only when deploying to live