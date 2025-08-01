# GitHub Actions Setup for Quote Automation

This guide shows how to set up GitHub Actions for automated quote reminders and expiry checking.

## 🚀 Quick Setup

### 1. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value | Where to Find |
|------------|--------|---------------|
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (secret) | Supabase Dashboard → Settings → API |
| `PUBLIC_SITE_URL` | Your production URL | e.g., `https://iwishbag.com` |
| `EMAIL_API_KEY` | Your email service API key | SendGrid/AWS SES/etc. |

### 2. Test Locally First

```bash
# Test the scripts locally
node scripts/test-github-actions-locally.js

# Or test individually
SUPABASE_URL=your-url SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/send-quote-reminders.js
SUPABASE_URL=your-url SUPABASE_SERVICE_ROLE_KEY=your-key node scripts/check-expired-quotes.js
```

### 3. Enable GitHub Actions

The workflows will automatically run:
- **Quote Reminders**: Daily at 10 AM UTC
- **Expiry Check**: Daily at 9 AM UTC

You can also trigger them manually from the Actions tab.

## 📧 Email Service Integration

The scripts currently log emails to console. To send real emails, update `scripts/send-quote-reminders.js`:

### Option 1: SendGrid
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(emailData) {
  await sgMail.send({
    to: emailData.to,
    from: 'noreply@iwishbag.com',
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  });
}
```

### Option 2: AWS SES
```javascript
const AWS = require('aws-sdk');
const ses = new AWS.SES({ region: 'us-east-1' });

async function sendEmail(emailData) {
  await ses.sendEmail({
    Source: 'noreply@iwishbag.com',
    Destination: { ToAddresses: [emailData.to] },
    Message: {
      Subject: { Data: emailData.subject },
      Body: {
        Html: { Data: emailData.html },
        Text: { Data: emailData.text }
      }
    }
  }).promise();
}
```

### Option 3: Resend
```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(emailData) {
  await resend.emails.send({
    from: 'noreply@iwishbag.com',
    to: emailData.to,
    subject: emailData.subject,
    html: emailData.html,
    text: emailData.text,
  });
}
```

## 📊 Monitoring

### View Action Results
1. Go to GitHub → Actions tab
2. Click on a workflow run
3. View the summary with statistics

### Email Notifications
GitHub will email you if actions fail. Configure in Settings → Notifications.

### Action Summaries
Each run creates a summary showing:
- Quotes processed
- Emails sent
- Errors encountered
- Daily statistics

## 🔧 Customization

### Change Schedule
Edit the cron expression in `.github/workflows/*.yml`:

```yaml
schedule:
  - cron: '0 10 * * *'  # Daily at 10 AM UTC
  # Examples:
  # - cron: '0 */6 * * *'  # Every 6 hours
  # - cron: '0 9,15 * * *' # At 9 AM and 3 PM
  # - cron: '0 10 * * 1-5' # Weekdays only
```

### Reminder Rules
Edit `scripts/send-quote-reminders.js` to change:
- Days before first reminder (default: 2)
- Days between reminders (default: 3)
- Maximum reminders (default: 3)

### Expiry Rules
Edit `scripts/check-expired-quotes.js` to change:
- Which statuses can expire
- Additional actions on expiry

## 🧪 Testing Workflows

### Manual Trigger
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Choose branch and run

### Test with Specific Quotes
Create test quotes with:
```sql
-- Quote that needs reminder
INSERT INTO quotes_v2 (
  customer_email, 
  status, 
  sent_at,
  created_at
) VALUES (
  'test@example.com',
  'sent',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
);

-- Quote about to expire
INSERT INTO quotes_v2 (
  customer_email,
  status,
  expires_at
) VALUES (
  'test@example.com',
  'sent',
  NOW() - INTERVAL '1 hour'
);
```

## 🚨 Troubleshooting

### Actions Not Running
- Check Actions are enabled in Settings
- Verify cron syntax
- Check for workflow errors

### Emails Not Sending
- Verify EMAIL_API_KEY secret
- Check email service logs
- Test email service separately

### Database Errors
- Verify SUPABASE_SERVICE_ROLE_KEY
- Check RLS policies
- Test database connection

## 📈 Success Metrics

Monitor these metrics weekly:
- **Reminder effectiveness**: Views after reminders
- **Expiry rate**: Quotes expiring vs converting
- **Email delivery**: Successful sends
- **Action reliability**: Success rate of runs