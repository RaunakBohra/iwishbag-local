# Database Reset Process Documentation

## Overview
The iwishBag database reset process ensures a complete and proper database setup including all tables, triggers, functions, and seed data.

## Quick Start
```bash
# Automated reset (recommended)
npm run db:reset

# Or run the script directly
./reset-db.sh
```

## What the Reset Script Does

### 1. **Database Reset**
- Drops and recreates the database
- Clears all existing data

### 2. **Cloud Schema Application**
- Applies the complete cloud database schema
- Creates all necessary tables (quotes, profiles, user_addresses, etc.)
- Sets up functions, triggers, and RLS policies

### 3. **Migration Execution**
- Runs all migrations in order
- Creates auth.users trigger for automatic profile creation
- Adds payment processing functions
- Creates payment_documents table

### 4. **Seed Data Loading**
- Payment gateways (10 records)
- Bank account details (3 records)
- Country settings (6 records)
- Quote statuses (13 records)

### 5. **Verification**
- Checks all critical tables exist
- Verifies triggers are in place
- Shows summary of database objects

## Required Files

The reset script requires these files in your project:
- `complete_cloud_dump.sql` or `cloud_schema_complete.sql` (in project root)
- `supabase/seed.sql` (seed data)
- `supabase/migrations/*.sql` (migration files)

## Manual Reset Process

If you need to reset manually:

```bash
# 1. Reset database without seed
supabase db reset --no-seed

# 2. Apply cloud schema
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f complete_cloud_dump.sql

# 3. Run migrations
supabase migration up

# 4. Apply seed data
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/seed.sql
```

## Troubleshooting

### "Table does not exist" errors
- Ensure cloud schema file exists in project root
- Check that the schema file was applied successfully

### "Duplicate key" errors
- The seed file uses ON CONFLICT clauses to handle existing data
- This is normal and can be ignored

### Auth trigger not working
- The script automatically creates the trigger if missing
- Verify with: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`

## Why Not Just Migrations?

The cloud schema is too large (9000+ lines) to be a migration. Instead:
- Cloud schema provides the complete database structure
- Migrations handle incremental changes
- Seed data populates initial configuration

This approach ensures:
- ✅ Complete database structure from cloud
- ✅ All custom additions via migrations
- ✅ Consistent seed data
- ✅ Automated verification

## Next Steps After Reset

1. Start your application: `npm run dev`
2. Login with admin credentials
3. Verify all features work correctly

## Important Notes

- Always backup important data before resetting
- The reset process drops ALL data
- Cloud schema must match your production database
- Keep seed data up to date with production requirements