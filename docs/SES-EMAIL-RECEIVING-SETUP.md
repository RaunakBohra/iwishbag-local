# AWS SES Email Receiving Setup Guide

## ✅ Current Status: WORKING

The email receiving system is now fully configured and operational. Emails sent to the following addresses will be automatically stored in S3:

- support@mail.iwishbag.com
- info@mail.iwishbag.com
- noreply@mail.iwishbag.com

## System Architecture

```
External Email → SES → Receipt Rule → S3 Bucket → Lambda (future) → Dashboard
```

## Configuration Details

### 1. S3 Bucket
- **Bucket Name**: `iwishbag-emails`
- **Region**: us-east-1
- **Email Storage Path**: `inbox/` prefix
- **Permissions**: Configured to allow SES to write emails

### 2. SES Receipt Rule Set
- **Rule Set Name**: `iwishbag-email-rules` (Active)
- **Rule Name**: `process-support-emails`
- **Recipients**: support@, info@, noreply@ @mail.iwishbag.com
- **Action**: Store in S3 bucket with `inbox/` prefix

### 3. AWS Permissions
The IAM user `iwishbag-ses` has been configured with:
- Full SES access
- S3 access to the email bucket
- Future permissions for Lambda, CloudWatch, etc.

## Testing the System

### Method 1: Send from External Email
1. Send an email from Gmail/Outlook/any email client to:
   - support@mail.iwishbag.com
   - info@mail.iwishbag.com
   - noreply@mail.iwishbag.com

2. Check S3 bucket:
```bash
node test-email-receiving.js
```

### Method 2: Check S3 Directly
```bash
aws s3 ls s3://iwishbag-emails/inbox/
```

## Next Steps

### 1. Lambda Function for Email Processing
Create a Lambda function to:
- Parse incoming emails
- Extract attachments
- Store metadata in database
- Trigger notifications

### 2. Email Dashboard
Build a dashboard to:
- View received emails
- Search and filter
- Reply to emails
- Manage attachments

### 3. Move SES Out of Sandbox
Currently in sandbox mode. To receive emails from any sender:
1. Request production access in AWS SES console
2. Provide use case details
3. Wait for approval (usually 24 hours)

## Cost Breakdown

### Current Setup (250 emails/day)
- **SES Receiving**: $0.09/month (first 1000 free)
- **S3 Storage**: ~$0.02/month
- **S3 Requests**: ~$0.08/month
- **Total**: ~$0.19/month

### With Attachments
- **Additional S3**: ~$0.58/month (25GB)
- **R2 Alternative**: $0.375/month (cheaper for attachments)

## Troubleshooting

### Email Not Appearing in S3
1. Check MX records point to AWS SES
2. Verify receipt rule is active
3. Check S3 bucket permissions
4. Look for bounce notifications

### Permission Errors
1. Ensure IAM user has correct policies
2. Check S3 bucket policy allows SES
3. Verify no permission boundaries blocking access

## Files Reference

- **Test Script**: `test-email-receiving.js`
- **S3 Bucket Policy**: `s3-ses-bucket-policy-fixed.json`
- **SES Receipt Rule**: `ses-receipt-rule.json`
- **IAM Policy**: `aws-iwishbag-unified-policy.json`