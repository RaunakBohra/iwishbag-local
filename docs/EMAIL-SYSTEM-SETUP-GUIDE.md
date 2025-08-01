# Email System Setup Guide

## Current Architecture

```
Sending: App → Edge Function → SES → S3 + Supabase
Receiving: Email → SES → S3 → Lambda → Supabase
```

## Setup Steps

### 1. Create Supabase Table (First!)
Run the SQL in `apply-email-messages-table.sql` in your Supabase SQL Editor.

### 2. Deploy Edge Function for Sending
```bash
npx supabase functions deploy send-email-ses
```

### 3. Deploy Lambda Function for Processing
```bash
# First, set environment variables
export VITE_SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Deploy the Lambda function
./lambda/deploy-email-processor.sh
```

### 4. Update SES Receipt Rule
```bash
./update-ses-receipt-rule.sh
```

## Testing

### Test Sending
```bash
npm run test:email
```

### Test Receiving
1. Send email to `support@mail.iwishbag.com`
2. Check Supabase email_messages table
3. Check S3 bucket for raw email

## Email Flow

### Sending Emails
1. App calls edge function with email data
2. Edge function sends via SES
3. Stores in S3: `sent/` folder
4. Stores metadata in Supabase

### Receiving Emails
1. Email arrives at SES
2. SES stores in S3: `inbox/` folder
3. S3 triggers Lambda function
4. Lambda parses email and stores in Supabase

## Dashboard Access
- View all emails in Supabase table `email_messages`
- Raw emails in S3 bucket `iwishbag-emails`
- Sent emails: `s3://iwishbag-emails/sent/`
- Received emails: `s3://iwishbag-emails/inbox/`

## Monitoring
- CloudWatch Logs for Lambda function
- Supabase Edge Function logs
- S3 bucket for raw email storage

## Cost Breakdown (250 emails/day)
- SES: ~$0.25/month
- S3: ~$0.10/month
- Lambda: ~$0.05/month
- Total: ~$0.40/month

## Troubleshooting

### Emails not being received
1. Check domain verification: `mail.iwishbag.com`
2. Check MX records point to SES
3. Check receipt rule is active
4. Check Lambda function logs

### Lambda function errors
1. Check CloudWatch logs
2. Verify Supabase credentials
3. Check IAM permissions