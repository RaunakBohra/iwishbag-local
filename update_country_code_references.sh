#!/bin/bash

# Script to update all country_code references to destination_country
# This will update TypeScript/JavaScript files

echo "Updating country_code references to destination_country..."

# Create backup directory
mkdir -p ./backup_before_country_code_update
cp -r ./src ./backup_before_country_code_update/

# Files to exclude from updates
EXCLUDE_PATTERNS=(
  "*/node_modules/*"
  "*/supabase/types.ts"
  "*/migrations/*"
  "*.sql"
)

# Update .country_code to .destination_country
echo "Updating object property accesses..."
find ./src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  # Skip excluded files
  skip=false
  for pattern in "${EXCLUDE_PATTERNS[@]}"; do
    if [[ "$file" == $pattern ]]; then
      skip=true
      break
    fi
  done
  
  if [ "$skip" = false ]; then
    # Update property accesses
    sed -i '' 's/\.country_code/\.destination_country/g' "$file"
    
    # Update object destructuring and property names
    sed -i '' 's/country_code:/destination_country:/g' "$file"
    sed -i '' 's/{ country_code\([^:]\)/{ destination_country\1/g' "$file"
    sed -i '' 's/\([^.]\)country_code =/\1destination_country =/g' "$file"
    
    # Update string references in queries
    sed -i '' "s/'country_code'/'destination_country'/g" "$file"
    sed -i '' 's/"country_code"/"destination_country"/g' "$file"
  fi
done

echo "Updates complete! Backup saved in ./backup_before_country_code_update/"
echo "Please run: npm run build"
echo "To test the changes"