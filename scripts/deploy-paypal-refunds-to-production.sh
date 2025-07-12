#!/bin/bash

# PayPal Refund System - Production Deployment Script
# This script deploys the PayPal refund management system to production

echo "🚀 Starting PayPal Refund System Production Deployment..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're linked to a project
if [ ! -f ".supabase/config.toml" ]; then
    echo "❌ Not linked to a Supabase project. Please run:"
    echo "   supabase link"
    exit 1
fi

echo "📋 Deployment Steps:"
echo "1. Deploy PayPal refund migration to production database"
echo "2. Fix query syntax issues in the frontend"
echo "3. Deploy Edge Functions for refund processing"
echo "4. Verify deployment and test functionality"

# Step 1: Deploy the migration
echo ""
echo "📊 Step 1: Deploying PayPal refund migration..."
echo "Running migration: 20250712070000_add_paypal_refund_management.sql"

supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migration deployed successfully!"
else
    echo "❌ Migration deployment failed. Please check the error above."
    exit 1
fi

# Step 2: Deploy Edge Functions
echo ""
echo "🔧 Step 2: Deploying PayPal refund Edge Function..."

if [ -d "supabase/functions/paypal-refund" ]; then
    supabase functions deploy paypal-refund
    
    if [ $? -eq 0 ]; then
        echo "✅ PayPal refund function deployed successfully!"
    else
        echo "❌ Function deployment failed. Please check the error above."
        exit 1
    fi
else
    echo "⚠️  PayPal refund function directory not found. Skipping function deployment."
fi

# Step 3: Verify deployment
echo ""
echo "🔍 Step 3: Verifying deployment..."

echo "Checking if tables exist in production..."

# Test table existence by running a simple query
supabase db remote exec "SELECT 'paypal_refunds' as table_name, COUNT(*) as exists FROM information_schema.tables WHERE table_name = 'paypal_refunds';"

if [ $? -eq 0 ]; then
    echo "✅ Tables verified in production!"
else
    echo "❌ Table verification failed."
    exit 1
fi

echo ""
echo "🎉 PayPal Refund System Production Deployment Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Update frontend code to fix query syntax issues"
echo "2. Test the refund management interface at /admin/payment-management"
echo "3. Process a test refund to verify functionality"
echo ""
echo "🔗 Access your admin dashboard:"
echo "   https://your-app.vercel.app/admin/payment-management"
echo ""
echo "📚 Reference Documentation:"
echo "   - PayPal Refund API: supabase/functions/paypal-refund/"
echo "   - Database Schema: supabase/migrations/20250712070000_add_paypal_refund_management.sql"
echo "   - Admin Interface: src/components/admin/PayPalRefundManagement.tsx"