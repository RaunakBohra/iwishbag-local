#!/bin/bash

echo "🔧 Fixing Lambda Production Configuration..."
echo "==========================================="
echo ""

FUNCTION_NAME="iwishbag-process-incoming-email"

echo "❌ Current configuration shows LOCAL Supabase URL: http://127.0.0.1:54321"
echo "✅ Need to update to PRODUCTION Supabase URL"
echo ""

echo "Please provide your PRODUCTION Supabase details:"
echo ""

# Get production Supabase URL
read -p "🌐 Enter your PRODUCTION Supabase URL (e.g., https://your-project.supabase.co): " PROD_SUPABASE_URL

# Get production service role key
read -p "🔑 Enter your PRODUCTION Supabase Service Role Key: " PROD_SERVICE_KEY

if [ -z "$PROD_SUPABASE_URL" ] || [ -z "$PROD_SERVICE_KEY" ]; then
    echo "❌ Both URL and Service Key are required. Exiting."
    exit 1
fi

echo ""
echo "🚀 Updating Lambda environment variables..."

aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --environment "Variables={SUPABASE_URL=$PROD_SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY=$PROD_SERVICE_KEY}" \
    --output table

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Lambda configuration updated successfully!"
    echo ""
    echo "🔍 Verifying new configuration..."
    aws lambda get-function-configuration --function-name $FUNCTION_NAME --query 'Environment.Variables.SUPABASE_URL' --output text
    echo ""
    echo "🎉 Your Lambda function is now configured to use PRODUCTION Supabase!"
    echo ""
    echo "📧 Next steps:"
    echo "  1. Send a test email to support@mail.iwishbag.com"  
    echo "  2. Check your production Supabase dashboard"
    echo "  3. Verify the email appears in your admin email dashboard"
else
    echo "❌ Failed to update Lambda configuration"
    exit 1
fi