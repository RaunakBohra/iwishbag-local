#!/bin/bash

# Lambda function configuration
FUNCTION_NAME="iwishbag-process-incoming-email"
RUNTIME="nodejs18.x"
ROLE_NAME="iwishbag-lambda-email-processor"
HANDLER="index.handler"
TIMEOUT=60
MEMORY=256

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Deploying Email Processor Lambda Function"

# Step 1: Create IAM role for Lambda
echo -e "\n${GREEN}Step 1: Creating IAM role...${NC}"
cat > lambda-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document file://lambda-trust-policy.json \
  2>/dev/null || echo "Role already exists"

# Step 2: Attach policies to the role
echo -e "\n${GREEN}Step 2: Attaching policies...${NC}"
cat > lambda-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::iwishbag-emails/*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name $ROLE_NAME \
  --policy-name LambdaExecutionPolicy \
  --policy-document file://lambda-policy.json

# Wait for role to be ready
echo "Waiting for IAM role to be ready..."
sleep 10

# Step 3: Install dependencies and create deployment package
echo -e "\n${GREEN}Step 3: Creating deployment package...${NC}"
cd lambda/process-incoming-email
npm install
zip -r ../../lambda-deployment.zip .
cd ../..

# Step 4: Create or update Lambda function
echo -e "\n${GREEN}Step 4: Deploying Lambda function...${NC}"

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)

# Check if function exists
if aws lambda get-function --function-name $FUNCTION_NAME 2>/dev/null; then
  echo "Updating existing function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://lambda-deployment.zip
else
  echo "Creating new function..."
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime $RUNTIME \
    --role $ROLE_ARN \
    --handler $HANDLER \
    --timeout $TIMEOUT \
    --memory-size $MEMORY \
    --zip-file fileb://lambda-deployment.zip
fi

# Step 5: Set environment variables
echo -e "\n${GREEN}Step 5: Setting environment variables...${NC}"

# Read Supabase service role key from secrets
SERVICE_KEY=$(npx supabase secrets get SUPABASE_SERVICE_ROLE_KEY 2>/dev/null | grep "SUPABASE_SERVICE_ROLE_KEY" | awk '{print $3}')
SUPABASE_URL="https://grgvlrvywsfmnmkxrecd.supabase.co"

if [ -z "$SERVICE_KEY" ]; then
  echo "⚠️  Could not get service role key. Please set it manually after deployment."
  echo "Use: aws lambda update-function-configuration --function-name $FUNCTION_NAME --environment Variables=\"{SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=your-key}\""
else
  aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment Variables="{SUPABASE_URL=$SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY}"
fi

# Step 6: Add S3 trigger permission
echo -e "\n${GREEN}Step 6: Adding S3 trigger permission...${NC}"
aws lambda add-permission \
  --function-name $FUNCTION_NAME \
  --statement-id AllowS3Invoke \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn arn:aws:s3:::iwishbag-emails \
  --source-account $(aws sts get-caller-identity --query Account --output text) \
  2>/dev/null || echo "Permission already exists"

# Cleanup
rm -f lambda-trust-policy.json lambda-policy.json lambda-deployment.zip

echo -e "\n${GREEN}✅ Lambda function deployed successfully!${NC}"
echo -e "\nFunction ARN: $(aws lambda get-function --function-name $FUNCTION_NAME --query 'Configuration.FunctionArn' --output text)"
echo -e "\n${GREEN}Next steps:${NC}"
echo "1. Update SES receipt rule to trigger this Lambda function"
echo "2. The function will process emails and store metadata in Supabase"