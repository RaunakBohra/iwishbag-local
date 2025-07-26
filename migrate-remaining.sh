#!/bin/bash

# Batch migration script for remaining currencyService imports
echo "🔄 Starting batch migration of remaining currencyService imports..."

# List of files to migrate (excluding test files and OptimizedCurrencyService itself)
files=(
    "src/components/admin/DeliveryOptionsDisplay.tsx"
    "src/components/admin/DeliveryOptionsManager.tsx" 
    "src/components/admin/ExchangeRateManager.tsx"
    "src/components/admin/MarkupManager.tsx"
    "src/components/admin/PaymentManagementWidget.tsx"
    "src/components/admin/QuoteDetailForm.tsx"
    "src/components/admin/ShippingRouteManager.tsx"
    "src/components/admin/UnifiedPaymentModal.tsx"
    "src/components/customer/CustomerQuoteOptions.tsx"
    "src/components/customer/CustomerShippingSelector.tsx"
    "src/components/customer/InsuranceToggle.tsx"
    "src/components/guest/GuestCurrencySelector.tsx"
    "src/components/profile/UserPreferences.tsx"
    "src/pages/Checkout.tsx"
    "src/pages/Profile.tsx"
    "src/pages/QuoteRequestPage.tsx"
    "src/pages/PaypalSuccess.tsx"
    "src/pages/admin/QuoteDetail.tsx"
)

migrated=0
failed=0

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "🔄 Migrating: $file"
        
        # Replace the import statement
        if sed -i '' 's/import { currencyService } from.*CurrencyService.*/import { optimizedCurrencyService } from '\''@\/services\/OptimizedCurrencyService'\'';/' "$file"; then
            # Replace all occurrences of currencyService with optimizedCurrencyService
            if sed -i '' 's/currencyService\./optimizedCurrencyService\./g' "$file"; then
                echo "✅ Migrated: $file"
                ((migrated++))
            else
                echo "❌ Failed to replace references in: $file"
                ((failed++))
            fi
        else
            echo "❌ Failed to replace import in: $file"
            ((failed++))
        fi
    else
        echo "⚠️  File not found: $file"
    fi
done

echo ""
echo "📊 Migration Summary:"
echo "✅ Successfully migrated: $migrated files"
echo "❌ Failed: $failed files"
echo ""

if [ $failed -eq 0 ]; then
    echo "🎉 All files migrated successfully!"
    echo "Running TypeScript check..."
    npm run typecheck
else
    echo "⚠️  Some files failed to migrate. Please check manually."
fi