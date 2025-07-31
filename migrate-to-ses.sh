#!/bin/bash

echo "🔄 Migrating from Resend to AWS SES..."

# Find all files that call send-email function
echo "📍 Finding all email function calls..."

# Update TypeScript/JavaScript files
find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec grep -l "send-email" {} \; | while read file; do
  echo "📝 Updating $file"
  # Create backup
  cp "$file" "$file.backup"
  
  # Replace function calls
  sed -i '' "s/'send-email'/'send-email-ses'/g" "$file"
  sed -i '' 's/"send-email"/"send-email-ses"/g' "$file"
  sed -i '' 's/`send-email`/`send-email-ses`/g' "$file"
done

# Update Edge Functions that might call send-email
find supabase/functions -type f -name "*.ts" -exec grep -l "send-email" {} \; | grep -v "send-email-ses" | while read file; do
  echo "📝 Updating $file"
  # Create backup
  cp "$file" "$file.backup"
  
  # Replace function calls
  sed -i '' "s/'send-email'/'send-email-ses'/g" "$file"
  sed -i '' 's/"send-email"/"send-email-ses"/g' "$file"
  sed -i '' 's/`send-email`/`send-email-ses`/g' "$file"
done

echo "✅ Migration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review the changes (backup files created with .backup extension)"
echo "2. Set up AWS SES following setup-aws-ses.md"
echo "3. Add AWS credentials to Supabase secrets"
echo "4. Deploy the send-email-ses function"
echo "5. Test email sending"
echo ""
echo "🔍 To find backup files: find . -name '*.backup' -type f"
echo "🗑️  To remove backup files: find . -name '*.backup' -type f -delete"