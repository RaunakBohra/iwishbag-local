#!/bin/bash

# Environment Setup Script for iwishBag
# This script helps set up environment variables securely

set -e

echo "🚀 iwishBag Environment Setup"
echo "=============================="

# Function to create .env file from example
create_env_file() {
    local source_file=$1
    local target_file=$2
    local env_type=$3
    
    if [ -f "$target_file" ]; then
        echo "⚠️  $target_file already exists. Backup created as $target_file.backup"
        cp "$target_file" "$target_file.backup"
    fi
    
    echo "📝 Creating $target_file from $source_file"
    cp "$source_file" "$target_file"
    
    echo "✅ $target_file created successfully"
    echo "⚡ Please edit $target_file and add your actual $env_type credentials"
}

# Main environment setup
echo ""
echo "🔧 Setting up environment files..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create local development environment
if [ -f ".env.local.example" ]; then
    create_env_file ".env.local.example" ".env.local" "local development"
else
    echo "❌ Error: .env.local.example not found"
fi

# Create production environment
if [ -f ".env.production.example" ]; then
    create_env_file ".env.production.example" ".env.production" "production"
else
    echo "❌ Error: .env.production.example not found"
fi

# Create Supabase functions environment
if [ -f "supabase/functions/.env.local.example" ]; then
    create_env_file "supabase/functions/.env.local.example" "supabase/functions/.env.local" "Supabase functions"
else
    echo "❌ Error: supabase/functions/.env.local.example not found"
fi

echo ""
echo "🎯 Next Steps:"
echo "==============="
echo ""
echo "1. 📝 Edit .env.local with your local development credentials:"
echo "   - AWS credentials for SES email"
echo "   - API keys for third-party services"
echo "   - Payment gateway test keys"
echo ""
echo "2. 📝 Edit .env.production with your production credentials:"
echo "   - Production API keys and secrets"
echo "   - Live payment gateway keys"
echo "   - Production database connections"
echo ""
echo "3. 📝 Edit supabase/functions/.env.local with Edge Function secrets:"
echo "   - AWS credentials for SES functions"
echo "   - Webhook secrets for payment processors"
echo ""
echo "4. 🚀 Deploy secrets to production:"
echo "   - Supabase: Dashboard → Edge Functions → Secrets"
echo "   - Cloudflare: Dashboard → Workers → Environment Variables"
echo "   - GitHub: Repository → Settings → Secrets and Variables"
echo ""
echo "5. ✅ Test your setup:"
echo "   npm run dev  # Local development"
echo "   npm run build  # Production build"
echo ""
echo "🔒 Security Reminders:"
echo "======================"
echo "• Never commit .env files to git"
echo "• Use different keys for development vs production"
echo "• Rotate keys regularly"
echo "• Monitor API usage and costs"
echo ""
echo "✅ Environment setup complete!"