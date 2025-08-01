#!/bin/bash

echo "🔧 Checking Lambda Function Configuration..."
echo "============================================"
echo ""

FUNCTION_NAME="iwishbag-process-incoming-email"

# Check if function exists
echo "📋 Checking if Lambda function exists..."
aws lambda get-function --function-name $FUNCTION_NAME >/dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Lambda function '$FUNCTION_NAME' exists"
else
    echo "❌ Lambda function '$FUNCTION_NAME' not found"
    exit 1
fi

echo ""
echo "🔐 Checking environment variables..."
ENV_VARS=$(aws lambda get-function-configuration --function-name $FUNCTION_NAME --query 'Environment.Variables' --output json 2>/dev/null)

if [ "$ENV_VARS" != "null" ] && [ "$ENV_VARS" != "{}" ]; then
    echo "Environment variables found:"
    echo "$ENV_VARS" | jq -r 'to_entries[] | "  \(.key): \(.value | if length > 50 then .[:47] + "..." else . end)"'
    
    # Check for required variables
    echo ""
    echo "🔍 Checking required variables..."
    
    SUPABASE_URL=$(echo "$ENV_VARS" | jq -r '.SUPABASE_URL // empty')
    SUPABASE_KEY=$(echo "$ENV_VARS" | jq -r '.SUPABASE_SERVICE_ROLE_KEY // empty')
    
    if [ -n "$SUPABASE_URL" ]; then
        echo "✅ SUPABASE_URL is set: $SUPABASE_URL"
    else
        echo "❌ SUPABASE_URL is missing"
    fi
    
    if [ -n "$SUPABASE_KEY" ]; then
        echo "✅ SUPABASE_SERVICE_ROLE_KEY is set: ${SUPABASE_KEY:0:10}..."
    else
        echo "❌ SUPABASE_SERVICE_ROLE_KEY is missing"
    fi
else
    echo "❌ No environment variables found"
fi

echo ""
echo "⚙️  Checking Lambda function details..."
aws lambda get-function-configuration --function-name $FUNCTION_NAME --query '{
    Runtime: Runtime,
    Handler: Handler,
    Timeout: Timeout,
    MemorySize: MemorySize,
    LastModified: LastModified
}' --output table

echo ""
echo "🔗 Checking recent invocations..."
aws lambda get-function --function-name $FUNCTION_NAME --query 'Configuration.LastModified' --output text