#!/bin/bash

# PayU Production Environment Setup Script
# This script helps set up the production environment variables for PayU integration

echo "🚀 Setting up PayU Production Environment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to prompt for input
prompt_for_input() {
    local prompt_message="$1"
    local variable_name="$2"
    local is_secret="$3"
    
    echo -e "${YELLOW}$prompt_message${NC}"
    if [ "$is_secret" = "true" ]; then
        read -s -r value
        echo
    else
        read -r value
    fi
    
    if [ -z "$value" ]; then
        echo -e "${RED}Error: $variable_name cannot be empty${NC}"
        exit 1
    fi
    
    echo "$value"
}

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: This script must be run from the root of your project repository${NC}"
    exit 1
fi

echo "📋 Please provide your PayU production credentials:"
echo "   You can get these from your PayU merchant dashboard"
echo ""

# Get PayU credentials
PAYU_MERCHANT_KEY=$(prompt_for_input "Enter your PayU Production Merchant Key:" "PAYU_MERCHANT_KEY" false)
PAYU_SALT_KEY=$(prompt_for_input "Enter your PayU Production Salt Key:" "PAYU_SALT_KEY" true)

# Get production domain
echo ""
PRODUCTION_DOMAIN=$(prompt_for_input "Enter your production domain (e.g., https://yoursite.com):" "PRODUCTION_DOMAIN" false)

# Remove trailing slash if present
PRODUCTION_DOMAIN=${PRODUCTION_DOMAIN%/}

# Generate webhook URL
WEBHOOK_URL="${PRODUCTION_DOMAIN}/supabase/functions/payment-webhook"

echo ""
echo "🔍 Configuration Summary:"
echo "========================"
echo "Merchant Key: ${PAYU_MERCHANT_KEY:0:8}..."
echo "Salt Key: [HIDDEN]"
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Confirm with user
echo -e "${YELLOW}⚠️  IMPORTANT STEPS TO COMPLETE:${NC}"
echo ""
echo "1. Set these environment variables in your production environment:"
echo "   PAYU_MERCHANT_KEY=$PAYU_MERCHANT_KEY"
echo "   PAYU_SALT_KEY=$PAYU_SALT_KEY"
echo "   PAYU_WEBHOOK_URL=$WEBHOOK_URL"
echo ""
echo "2. In your PayU merchant dashboard:"
echo "   - Go to Settings > Payment Configuration"
echo "   - Set Success URL: ${PRODUCTION_DOMAIN}/payment-success?gateway=payu"
echo "   - Set Failure URL: ${PRODUCTION_DOMAIN}/payment-failure?gateway=payu"
echo "   - Set Webhook URL: $WEBHOOK_URL"
echo ""
echo "3. Run the database update script:"
echo "   psql -d your_database -f scripts/update-payu-production.sql"
echo ""
echo "4. Test the webhook endpoint:"
echo "   curl -X POST $WEBHOOK_URL -H 'Content-Type: application/json' -d '{}'"
echo ""

# Generate environment file for reference
ENV_FILE="production-env-vars.txt"
cat > "$ENV_FILE" << EOF
# PayU Production Environment Variables
# Add these to your production environment (Supabase Edge Functions)

PAYU_MERCHANT_KEY=$PAYU_MERCHANT_KEY
PAYU_SALT_KEY=$PAYU_SALT_KEY
PAYU_WEBHOOK_URL=$WEBHOOK_URL

# PayU Dashboard Configuration URLs:
# Success URL: ${PRODUCTION_DOMAIN}/payment-success?gateway=payu
# Failure URL: ${PRODUCTION_DOMAIN}/payment-failure?gateway=payu
# Webhook URL: $WEBHOOK_URL

# Generated on: $(date)
EOF

echo "📄 Environment variables saved to: $ENV_FILE"
echo -e "${GREEN}✅ PayU production setup completed!${NC}"
echo ""
echo -e "${RED}🔒 SECURITY REMINDER:${NC}"
echo "   - Never commit production credentials to version control"
echo "   - Store credentials securely in your deployment environment"
echo "   - Delete the $ENV_FILE file after setting up your environment"
echo ""
echo "Next steps:"
echo "1. Set the environment variables in your production environment"
echo "2. Update PayU dashboard with the webhook URLs"
echo "3. Run the database update script"
echo "4. Test a payment transaction"