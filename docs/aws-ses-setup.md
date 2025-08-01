# AWS SES Email Configuration Guide

## Prerequisites
- AWS Account with SES access
- Verified domain: `mail.iwishbag.com`
- Verified email: `rnkbohra@gmail.com`

## Setup Options

### Option 1: Local Development (supabase/.env.local)

1. Get your AWS credentials:
   - Go to AWS Console → IAM → Users
   - Select your user or create a new one with SES permissions
   - Go to Security credentials → Create access key

2. Add to `supabase/.env.local`:
   ```bash
   AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
   AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   AWS_REGION=us-east-1
   ```

3. Restart Supabase:
   ```bash
   supabase stop
   supabase start
   ```

### Option 2: Supabase Dashboard (Production)

1. Go to your Supabase project dashboard
2. Navigate to Settings → Edge Functions → Secrets
3. Add these secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION`

### Option 3: Using QuoteEmailServiceLocal (Testing Only)

For testing without AWS credentials:

```typescript
import { QuoteEmailServiceLocal } from '@/services/QuoteEmailServiceLocal';

const emailService = new QuoteEmailServiceLocal();
await emailService.sendQuoteEmail(quoteId);
```

## Required IAM Policy

Your AWS IAM user needs this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

## Verify Your Setup

Run the test script:
```bash
npm run test:email
```

Or manually:
```bash
npx tsx src/scripts/test-ses-email.ts
```

## Common Issues

### 1. SES Sandbox Mode
- New AWS accounts start in sandbox mode
- Can only send to verified emails
- Request production access in AWS Console

### 2. Domain Not Verified
- Verify mail.iwishbag.com in SES → Verified identities
- Add required DNS records

### 3. Region Mismatch
- Ensure AWS_REGION matches where you verified your domain
- Common regions: us-east-1, eu-west-1, ap-southeast-1

### 4. Rate Limits
- Sandbox: 1 email/second, 200 emails/day
- Production: Varies by account reputation

## Testing Email Templates

1. Quote Email:
   ```typescript
   await emailService.sendQuoteEmail(quoteId);
   ```

2. Reminder Email:
   ```typescript
   await emailService.sendReminderEmail(quoteId);
   ```

## GitHub Actions Setup

Add these secrets to your GitHub repository:
- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The workflow will use Supabase Edge Functions which access the secrets from your dashboard.