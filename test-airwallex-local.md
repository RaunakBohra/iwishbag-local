# Testing Airwallex Integration Locally

## Setup Steps

1. **Terminal 1 - Run the development server:**
   ```bash
   npm run dev
   ```
   Your app should be running at http://localhost:8081

2. **Terminal 2 - Serve Supabase functions locally:**
   ```bash
   npx supabase functions serve create-payment --no-verify-jwt --env-file .env
   ```

3. **Terminal 3 - Start ngrok (optional, only if you need webhooks):**
   ```bash
   ngrok http 54321
   ```
   Note the https URL provided by ngrok (e.g., https://abc123.ngrok.io)

## Testing the Payment Flow

1. Open your browser to http://localhost:8081
2. Go to the checkout page
3. Select Airwallex as the payment method
4. Click "Place Order"

## Monitoring Logs

In Terminal 2 (where functions are running), you'll see detailed logs including:
- Authentication attempts
- API calls to Airwallex
- Success/error responses

## What to Look For

1. **Authentication Success:**
   ```
   🔐 Getting Airwallex access token...
   ✅ Airwallex authentication successful
   ```

2. **Payment Intent Creation:**
   ```
   ✅ Got access token, creating payment intent with OAuth2...
   Creating Airwallex payment intent with request:
   ```

3. **Common Issues:**
   - 401 Unauthorized: Check API key and client ID
   - 400 Bad Request: Check request payload format
   - Network errors: Check internet connection

## Webhook Testing (if needed)

If you need to test webhooks:
1. Copy the ngrok URL from Terminal 3
2. Use this format for webhook URL: `https://your-ngrok-id.ngrok.io/functions/v1/airwallex-webhook`
3. Configure this URL in your Airwallex dashboard or via API

## Troubleshooting

- If you see CORS errors, make sure you're using the local Supabase URL (http://127.0.0.1:54321)
- If authentication fails, verify your API credentials in the .env file
- Check that test_mode is set correctly in your payment gateway configuration