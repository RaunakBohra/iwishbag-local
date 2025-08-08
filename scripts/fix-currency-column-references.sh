#!/bin/bash

# Script to fix all remaining references to old currency columns
# Replaces total_usd -> total_quote_origincurrency
# Replaces final_total_usd -> final_total_origincurrency  
# Replaces total_customer_currency -> total_customer_display_currency

echo "🔧 Fixing currency column references across the codebase..."

# Change to the src directory
cd /Users/raunakbohra/Desktop/global-wishlist-hub/src

# Find all TypeScript/JavaScript files and replace patterns
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | while read file; do
    # Skip if file doesn't exist or is not readable
    if [ ! -f "$file" ] || [ ! -r "$file" ]; then
        continue
    fi
    
    # Count matches before replacement
    matches_before=$(grep -c "total_usd\|final_total_usd\|total_customer_currency" "$file" 2>/dev/null || echo 0)
    
    if [ "$matches_before" -gt 0 ]; then
        echo "📝 Updating $file ($matches_before references)"
        
        # Create backup
        cp "$file" "$file.backup"
        
        # Apply replacements using sed
        sed -i '' \
            -e 's/final_total_usd/final_total_origincurrency/g' \
            -e 's/total_usd/total_quote_origincurrency/g' \
            -e 's/total_customer_currency/total_customer_display_currency/g' \
            "$file"
            
        # Verify the changes worked
        if [ $? -eq 0 ]; then
            matches_after=$(grep -c "total_quote_origincurrency\|final_total_origincurrency\|total_customer_display_currency" "$file" 2>/dev/null || echo 0)
            echo "   ✅ Success: $matches_before -> $matches_after references updated"
            # Remove backup on success
            rm "$file.backup"
        else
            echo "   ❌ Failed to update $file, restoring backup"
            mv "$file.backup" "$file"
        fi
    fi
done

echo "🧹 Cleanup complete! Checking remaining old references..."

# Check for any remaining old column references
remaining=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -l "total_usd\|final_total_usd\|total_customer_currency" 2>/dev/null | wc -l)

if [ "$remaining" -eq 0 ]; then
    echo "🎉 SUCCESS: All old currency column references have been updated!"
else
    echo "⚠️  WARNING: $remaining files still contain old references"
    echo "Files that still need manual review:"
    find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs grep -l "total_usd\|final_total_usd\|total_customer_currency" 2>/dev/null | head -5
fi

echo "✅ Currency column reference fix complete!"