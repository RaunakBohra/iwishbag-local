# Khalti Payment Gateway Integration

## Overview
Khalti is integrated into the iwishBag platform as a payment option for customers in Nepal. The integration supports QR code-based payments and is currently running in **demo mode** due to invalid API credentials.

## Current Status: Demo Mode ⚠️
The integration is complete but running in demo mode because the provided API credentials are returning 401 "Invalid token" errors.

### Test Credentials (Not Working)
```
Test Secret Key: test_secret_key_283050de1a8c412684889fde576bb65c
Test Public Key: test_public_key_bc76e6b77d8140de9ca3dcd7555d1dfa
```

### Live Credentials (Not Working)
```
Live Secret Key: live_secret_key_a5b92431df324d14bd826ae2b5b64ebd
Live Public Key: live_public_key_496caf808f75472d97ab26d833784a8f
```

## To Enable Khalti

1. **Get Valid Credentials**
   - Log into Khalti Merchant Dashboard: https://dashboard.khalti.com/
   - Navigate to API Keys section
   - Generate new test and live API keys

2. **Update Database**
   ```sql
   UPDATE payment_gateways 
   SET config = jsonb_set(
     jsonb_set(
       jsonb_set(
         jsonb_set(config, '{test_secret_key}', '"your_new_test_secret_key"'::jsonb),
         '{test_public_key}', '"your_new_test_public_key"'::jsonb
       ),
       '{demo_mode}', 'false'::jsonb
     ),
     '{environment}', '"test"'::jsonb
   )
   WHERE code = 'khalti';
   ```

3. **Test the Integration**
   - Use the provided test scripts: `test-khalti.js` or `test-khalti-direct.js`
   - Verify payment initiation works
   - Test webhook callbacks

## Integration Components

### 1. Database Configuration
- Table: `payment_gateways`
- Code: `khalti`
- Stores API keys, URLs, and configuration

### 2. Edge Functions
- **create-payment**: Initiates Khalti payment
  - Converts USD → NPR → paisa
  - Validates minimum amount (10 NPR)
  - Returns payment URL for redirect
  
- **khalti-webhook**: Handles payment verification
  - Verifies payment status via Khalti lookup API
  - Updates quote status to 'paid'
  - Creates payment transaction record

- **khalti-callback**: Handles return from Khalti
  - Processes success/failure redirects
  - Updates frontend with payment status

### 3. Frontend Components
- Payment method selector shows Khalti option
- QR code payment flow support
- NPR currency display in payment success

### 4. Currency Conversion
- Base currency: USD (stored in database)
- Display currency: NPR (for Nepal)
- Payment amount: Paisa (1 NPR = 100 paisa)

## Payment Flow

1. **Customer selects Khalti** at checkout
2. **System converts amount** from USD to NPR to paisa
3. **API call to Khalti** creates payment session
4. **Customer redirected** to Khalti payment page
5. **Customer completes payment** via Khalti app
6. **Khalti sends webhook** to verify payment
7. **System updates quote** status to 'paid'
8. **Customer sees success** page

## API Endpoints

### Sandbox (Test)
- Base URL: `https://dev.khalti.com/api/v2`
- Payment Initiate: `/epayment/initiate/`
- Payment Lookup: `/epayment/lookup/`

### Production (Live)
- Base URL: `https://khalti.com/api/v2`
- Same endpoints as sandbox

## Testing

### Direct API Test
```bash
node test-khalti-direct.js
```

### Full Integration Test
```bash
node test-khalti.js
```

## Troubleshooting

### 401 Invalid Token
- Verify API keys are correct
- Ensure using correct environment (test/live)
- Check authorization header format: `Key {secret_key}`

### 503 Service Unavailable
- Khalti service may be temporarily down
- Try again later or contact Khalti support

### Amount Issues
- Ensure amount is in paisa (multiply NPR by 100)
- Minimum amount is 1000 paisa (10 NPR)

## Support
- Khalti Documentation: https://docs.khalti.com/khalti-epayment/
- Khalti Support: support@khalti.com
- Merchant Dashboard: https://dashboard.khalti.com/