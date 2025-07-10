# Email Testing Guide for iwishBag

## Overview
The email system is configured to work both locally (for testing) and in production (with Resend).

## Local Email Testing with Inbucket

### 1. Start Supabase Locally
```bash
supabase start
```

### 2. Access Inbucket Email UI
- Open: http://localhost:54324
- All emails sent locally will appear here
- No external API needed

### 3. Test Email Functionality

#### Option A: Use the Test Email Page
1. Navigate to: http://localhost:8080/admin/test-email
2. Enter recipient email
3. Click "Test Edge Function Email"
4. Check Inbucket for the email

#### Option B: Test Real Scenarios
1. **Bank Transfer Email**: 
   - Create an order with bank transfer payment
   - Email will be sent automatically
   - Check Inbucket for bank details email

2. **Quote Status Emails**:
   - Change quote status in admin panel
   - Status change emails are sent automatically

## Production Email Setup

### 1. Resend API Key
Your Resend API key is already configured in:
- `/supabase/functions/.env` (for local development)
- Supabase Dashboard > Edge Functions > Secrets (for production)

### 2. Deploy Edge Functions
```bash
# Deploy the email function
supabase functions deploy send-email
```

### 3. Verify Email Sending
- Emails will be sent via Resend API
- Check Resend dashboard for delivery status

## Email Types Implemented

1. **Bank Transfer Instructions** ✅
   - Sent when customer selects bank transfer payment
   - Includes bank details for the destination country
   - Template: `bank_transfer_details`

2. **Quote Status Updates**
   - Sent on status changes (pending → sent → approved → etc.)
   - Configured in status management system

3. **Order Confirmations**
   - Sent when payment is successful
   - Different templates for each payment method

## Troubleshooting

### Emails Not Sending Locally?
1. Check Edge Function logs:
   ```bash
   supabase functions serve send-email
   ```

2. Verify Inbucket is running:
   - Visit http://localhost:54324
   - Should see Inbucket UI

3. Check browser console for errors

### Emails Not Sending in Production?
1. Verify Resend API key is set:
   ```bash
   supabase secrets list
   ```

2. Check Edge Function logs in Supabase Dashboard

3. Verify sender domain in Resend Dashboard

## Testing Checklist

- [ ] Local Inbucket receives test emails
- [ ] Bank transfer emails include correct bank details
- [ ] Guest checkout emails work
- [ ] Authenticated user emails work
- [ ] Email templates render correctly
- [ ] Production Resend integration works

## Email Templates Location

- **Hook**: `/src/hooks/useEmailNotifications.ts`
- **Templates**: Defined inline in the hook
- **Bank Details Formatter**: `/src/lib/bankDetailsFormatter.ts`
- **Edge Function**: `/supabase/functions/send-email/index.ts`