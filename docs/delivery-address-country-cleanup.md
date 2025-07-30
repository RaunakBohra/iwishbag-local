# Delivery Address Country Column Cleanup

## Issue
The `delivery_addresses` table had redundant country columns:
- `country` (varchar(2)) - Old column
- `destination_country` (text) - Current column being used

This caused confusion and potential data inconsistency.

## Solution
Created migration `20250130000028_consolidate_delivery_address_country_columns.sql` that:

1. **Migrates Data**: Copies any data from `country` to `destination_country` where needed
2. **Standardizes Format**: Ensures all country codes are uppercase 2-letter ISO codes
3. **Removes Redundancy**: Drops the old `country` column
4. **Adds Constraints**: 
   - Makes `destination_country` NOT NULL
   - Adds check constraint for 2-character length
   - Sets default to 'US'
5. **Documents**: Adds column comment for clarity

## Code Changes
- Removed fallback logic in `AddressForm.tsx` that checked multiple column names
- Now only uses `destination_country` column

## Running the Migration
```bash
# Apply to local database
npx supabase migration up

# Or apply to production (after testing)
npx supabase db push
```

## Benefits
- Single source of truth for country data
- Consistent column naming
- Proper constraints ensure data quality
- Cleaner, more maintainable code