#!/bin/bash

# Configuration
RULE_SET_NAME="iwishbag-email-rules"
RULE_NAME="process-support-emails"
LAMBDA_FUNCTION_NAME="iwishbag-process-incoming-email"

echo "🔧 Updating SES Receipt Rule to trigger Lambda function"

# Get Lambda function ARN
LAMBDA_ARN=$(aws lambda get-function --function-name $LAMBDA_FUNCTION_NAME --query 'Configuration.FunctionArn' --output text 2>/dev/null)

if [ -z "$LAMBDA_ARN" ]; then
  echo "❌ Lambda function not found. Please deploy it first using:"
  echo "   ./lambda/deploy-email-processor.sh"
  exit 1
fi

echo "Lambda ARN: $LAMBDA_ARN"

# Create new rule configuration
cat > updated-receipt-rule.json <<EOF
{
  "Name": "$RULE_NAME",
  "Enabled": true,
  "TlsPolicy": "Optional",
  "Recipients": [
    "support@mail.iwishbag.com",
    "info@mail.iwishbag.com",
    "noreply@mail.iwishbag.com"
  ],
  "Actions": [
    {
      "S3Action": {
        "BucketName": "iwishbag-emails",
        "ObjectKeyPrefix": "inbox/"
      }
    },
    {
      "LambdaAction": {
        "FunctionArn": "$LAMBDA_ARN",
        "InvocationType": "Event"
      }
    }
  ],
  "ScanEnabled": false
}
EOF

# Delete the old rule first
echo "Deleting old receipt rule..."
aws ses delete-receipt-rule \
  --rule-set-name $RULE_SET_NAME \
  --rule-name $RULE_NAME 2>/dev/null || echo "No existing rule to delete"

# Create the new rule with Lambda action
echo "Creating new receipt rule with Lambda trigger..."
aws ses create-receipt-rule \
  --rule-set-name $RULE_SET_NAME \
  --rule file://updated-receipt-rule.json

if [ $? -eq 0 ]; then
  echo "✅ Receipt rule updated successfully!"
  echo "   - Emails will be stored in S3: s3://iwishbag-emails/inbox/"
  echo "   - Lambda function will process emails and store metadata in Supabase"
else
  echo "❌ Failed to update receipt rule"
fi

# Cleanup
rm -f updated-receipt-rule.json