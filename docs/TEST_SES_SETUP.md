# Testing Your AWS SES Setup

## Quick Test Options

### Option 1: Test via Production Deployment (Recommended)

Since AWS credentials are stored as secrets in your production Supabase, deploy and test there:

```bash
# Deploy the function to production
npx supabase functions deploy send-email-ses --project-ref YOUR_PROJECT_REF

# Test via curl (replace with your actual project URL and anon key)
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-email-ses \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "subject": "Test SES Email",
    "html": "<h1>Test from SES!</h1>"
  }'
```

### Option 2: Test Email Receiving

1. **Send a test email to your SES subdomain:**
   - To: `test@mail.iwishbag.com`
   - Subject: `Test Receive`
   - Body: Any content

2. **Check S3 bucket in AWS Console:**
   - Go to S3 > iwishbag-emails > inbox/
   - You should see the received email

3. **Check SES Console:**
   - Go to SES > Email receiving > Rule sets
   - Check if the rule is active

### Option 3: Create a Test Page in Your App

```typescript
// src/pages/TestSES.tsx
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function TestSES() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const sendTestEmail = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('send-email-ses', {
      body: {
        to: email,
        subject: 'Test Email from SES',
        html: '<h1>SES is working!</h1><p>This is a test email.</p>',
      }
    });

    setResult({ data, error });
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Test AWS SES</h1>
      
      <div className="space-y-4 max-w-md">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        
        <Button onClick={sendTestEmail} disabled={loading || !email}>
          {loading ? 'Sending...' : 'Send Test Email'}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Verification Steps

### 1. Check SES Sending
- AWS Console > SES > Sending statistics
- Look for sent emails count

### 2. Check Email Receiving  
- AWS Console > S3 > iwishbag-emails bucket
- Look for files in inbox/ folder

### 3. Check CloudWatch Logs
- AWS Console > CloudWatch > Log groups
- Look for Lambda function logs

### 4. Check DNS Records
```bash
# Verify MX records
dig MX mail.iwishbag.com

# Should return:
# 10 feedback-smtp.us-east-1.amazonaws.com
```

## Common Issues

### "Email not verified"
- SES is in sandbox mode
- Verify recipient email in SES console

### "Access Denied"
- Check IAM permissions
- Verify S3 bucket policy

### "DNS not propagated"
- Wait 15-30 minutes
- Clear DNS cache: `sudo dscacheutil -flushcache`

## Next Steps

1. **Move SES out of sandbox**
   - Request production access in SES console

2. **Set up bounce handling**
   - Configure SNS topics for bounces/complaints

3. **Add email templates**
   - Create reusable templates in SES

4. **Monitor deliverability**
   - Set up CloudWatch alarms
   - Track bounce/complaint rates