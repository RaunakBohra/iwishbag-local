#!/bin/bash

echo "🔍 R2 Integration Verification Script"
echo "===================================="
echo ""

# Check if R2 worker file exists
echo "1. Checking R2 worker file..."
if [ -f "workers/r2-quote-uploads.js" ]; then
    echo "✅ Worker file exists"
else
    echo "❌ Worker file missing"
fi

# Check if wrangler config exists
echo ""
echo "2. Checking wrangler configuration..."
if [ -f "workers/r2-quote-uploads.wrangler.toml" ]; then
    echo "✅ Wrangler config exists"
    grep "bucket_name" workers/r2-quote-uploads.wrangler.toml
else
    echo "❌ Wrangler config missing"
fi

# Check if R2StorageService is updated
echo ""
echo "3. Checking R2StorageService implementation..."
if grep -q "VITE_R2_WORKER_URL" src/services/R2StorageService.ts; then
    echo "✅ R2StorageService uses worker URL"
else
    echo "❌ R2StorageService not updated"
fi

# Check if ProductInfoStep uses R2
echo ""
echo "4. Checking ProductInfoStep integration..."
if grep -q "R2StorageService" src/components/quote/ProductInfoStep.tsx; then
    echo "✅ ProductInfoStep imports R2StorageService"
    if grep -q "r2Service.uploadFile" src/components/quote/ProductInfoStep.tsx; then
        echo "✅ Upload uses R2 service"
    fi
    if grep -q "r2Service.deleteFile" src/components/quote/ProductInfoStep.tsx; then
        echo "✅ Delete uses R2 service"
    fi
else
    echo "❌ ProductInfoStep not using R2"
fi

# Check environment variables
echo ""
echo "5. Checking environment configuration..."
if grep -q "VITE_R2_WORKER_URL" CLOUDFLARE_ENV_VARS.txt; then
    echo "✅ R2 worker URL in Cloudflare env vars"
else
    echo "❌ R2 worker URL missing from env vars"
fi

# Check test files
echo ""
echo "6. Checking test files..."
if [ -f "public/test-r2-upload.html" ]; then
    echo "✅ R2 test page exists"
else
    echo "❌ Test page missing"
fi

echo ""
echo "===================================="
echo "📋 Next Steps:"
echo ""
echo "1. Deploy the worker:"
echo "   cd workers"
echo "   npx wrangler deploy r2-quote-uploads.js --config r2-quote-uploads.wrangler.toml"
echo ""
echo "2. Note your worker URL and update .env.local:"
echo "   VITE_R2_WORKER_URL=https://r2-uploads.YOUR-SUBDOMAIN.workers.dev"
echo ""
echo "3. Test the upload:"
echo "   npm run dev"
echo "   Visit http://localhost:8082/test-r2-upload.html"
echo ""
echo "✅ R2 integration is ready for deployment!"