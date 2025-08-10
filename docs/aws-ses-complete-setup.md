# Complete AWS SES Setup for iwishBag

## Current Implementation Status

### ✅ Configured Services

1. **Quote Email Service** (`QuoteEmailService.ts`)
   - Sends quote emails with share links
   - Sends reminder emails (max 3)
   - Uses AWS SES via `send-email-ses` edge function

2. **Email Notifications Hook** (`useEmailNotifications.ts`)
   - All email templates now use AWS SES
   - Supports: quotes, orders, tickets, auth, payments
   - Professional HTML + plain text emails

3. **Payment Link Emails** (`send-payment-link-email`)
   - Multi-currency payment notifications
   - Uses AWS SES for reliable delivery

4. **Edge Function** (`send-email-ses`)
   - Central AWS SES integration
   - Supports HTML/text, attachments, custom headers
   - Configured with your domain: `mail.iwishbag.com`

### 📧 Email Configuration

**Default Sender Settings:**
- From: `iwishBag <noreply@mail.iwishbag.com>`
- Reply-To: `support@mail.iwishbag.com`
- Payment Emails: `payments@mail.iwishbag.com`

### 🔧 Environment Variables

**Local Development** (`supabase/.env.local`):
```bash
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1
```

**Production** (Supabase Dashboard → Edge Functions → Secrets):
- Add the same AWS credentials as secrets

### 📨 Email Types Configured

1. **Quote Emails**
   - Initial quote with share link
   - Reminder emails (3-tier system)
   - Approval/rejection notifications

2. **Order Emails**
   - Shipping notifications
   - Delivery confirmations
   - Tracking updates

3. **Payment Emails**
   - Payment links with expiry
   - Bank transfer details
   - Payment confirmations

4. **Support Tickets**
   - New ticket notifications
   - Status updates
   - Reply notifications
   - Closure confirmations

5. **Authentication**
   - Password reset links
   - Email confirmations
   - Magic links
   - Email change verification

### 🚀 Testing Commands

```bash
# Test basic AWS SES connection
npm run test:email

# Test quote email sending
npx tsx src/scripts/test-real-ses-quote.ts

# Test local email (console output)
npx tsx src/scripts/test-local-email.ts

# Configure AWS credentials
npm run setup:aws
```

### 📝 Supabase Auth Emails

Currently using local SMTP (Inbucket) for auth emails. To use AWS SES for auth emails:

1. **Option 1: Update config.toml** (for cloud deployment)
   ```toml
   [auth.email.smtp]
   enabled = true
   host = "email-smtp.us-east-1.amazonaws.com"
   port = 587
   user = "env(AWS_SES_SMTP_USERNAME)"
   pass = "env(AWS_SES_SMTP_PASSWORD)"
   admin_email = "noreply@mail.iwishbag.com"
   sender_name = "iWishBag"
   ```

2. **Option 2: Keep using edge function**
   - Auth emails go through Inbucket locally
   - Custom emails use AWS SES edge function

### 🔄 GitHub Actions

The quote reminder workflow (`quote-reminders.yml`) is configured to:
- Run daily at 10 AM UTC
- Find quotes needing reminders
- Send via AWS SES edge function
- Generate summary reports

### 📊 Monitoring

1. **AWS SES Console**
   - Monitor sending statistics
   - Check bounce/complaint rates
   - View sending quota

2. **Supabase Dashboard**
   - Edge Functions → Logs
   - Check email sending success/failures

3. **Local Testing**
   - Console logs for debugging
   - Test scripts for validation

### 🛡️ Security Notes

1. **Never commit AWS credentials** to git
2. **Use environment variables** for sensitive data
3. **Rotate credentials** regularly
4. **Monitor AWS SES** for unusual activity

### 📋 Remaining Tasks

1. **Migration**: Update any remaining email senders
2. **Templates**: Create more email templates as needed
3. **Analytics**: Set up email tracking/analytics
4. **Webhooks**: Handle SES notifications (bounces, complaints)

### 💡 Best Practices

1. **Always include plain text** version of emails
2. **Test emails** before production deployment
3. **Handle errors gracefully** with fallbacks
4. **Log email activities** for debugging
5. **Respect rate limits** (SES quotas)

## Quick Reference

```typescript
// Send email via AWS SES
const { data, error } = await supabase.functions.invoke('send-email-ses', {
  body: {
    to: 'customer@example.com',
    subject: 'Your Subject',
    html: '<p>HTML content</p>',
    text: 'Plain text content',
    from: 'iwishBag <noreply@mail.iwishbag.com>',
    replyTo: 'support@mail.iwishbag.com'
  }
});
```