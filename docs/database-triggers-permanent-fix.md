# Database Triggers - Permanent Fix Documentation

## Problem
Database triggers, especially the critical `on_auth_user_created` trigger, were not persisting through database resets. This caused users to be created without profiles or roles.

## Root Cause
1. **No Migration Files**: The `supabase/migrations/` directory was empty
2. **Seed.sql Issues**: While trigger creation was in seed.sql, it wasn't executing reliably
3. **No Verification System**: No mechanism to verify and repair missing triggers after resets

## Permanent Solution Implemented

### 1. Migration Files Created
Created two migration files that will run automatically:
- `20250116_create_auth_users_trigger.sql` - Creates the auth.users trigger
- `20250116_verify_critical_triggers.sql` - Verification and repair system

### 2. How Migrations Work
```bash
# Migrations run automatically during:
supabase db reset        # Local database reset
supabase db push         # Push to remote
supabase start          # Starting local development
```

### 3. Verification Function
Created `verify_critical_triggers()` function that:
- Checks if critical triggers exist
- Creates them if missing
- Fixes existing users without roles
- Can be called manually anytime

### 4. Making Database Changes Permanent

#### For Triggers:
```sql
-- Create in a migration file: supabase/migrations/YYYYMMDD_description.sql
CREATE TRIGGER trigger_name 
AFTER INSERT ON table_name 
FOR EACH ROW 
EXECUTE FUNCTION function_name();
```

#### For Functions:
```sql
-- Create in a migration file
CREATE OR REPLACE FUNCTION function_name()
RETURNS return_type AS $$
BEGIN
    -- Function logic
END;
$$ LANGUAGE plpgsql;
```

#### For Table Changes:
```sql
-- Create in a migration file
ALTER TABLE table_name ADD COLUMN column_name data_type;
```

### 5. Best Practices for Permanent Fixes

1. **Always Use Migrations**
   - Never apply changes directly to the database
   - Create migration files in `supabase/migrations/`
   - Use format: `YYYYMMDD_HHMMSS_description.sql`

2. **Include Verification**
   - Add IF NOT EXISTS checks
   - Create verification functions
   - Handle existing data

3. **Test Persistence**
   ```bash
   # Test your changes survive a reset:
   supabase db reset
   # Then verify your changes are still there
   ```

4. **Document Critical Dependencies**
   - List required functions
   - Note table relationships
   - Document trigger purposes

### 6. Current Critical Triggers

| Trigger | Table | Purpose | Function |
|---------|-------|---------|----------|
| `on_auth_user_created` | auth.users | Create profile & role for new users | `handle_new_user()` |
| `update_quotes_updated_at` | quotes | Update timestamp on changes | `update_updated_at_column()` |
| `generate_quote_display_id` | quotes | Generate human-readable IDs | `generate_display_id()` |
| `sync_payment_amounts_trigger` | payment_ledger | Sync payment totals | `sync_quote_payment_amounts()` |

### 7. Manual Verification
```sql
-- Check if triggers exist
SELECT * FROM verify_critical_triggers();

-- List all triggers
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth');

-- Fix missing user roles manually
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'
FROM auth.users u
LEFT JOIN public.user_roles r ON u.id = r.user_id
WHERE r.user_id IS NULL;
```

### 8. Preventing Future Issues

1. **Use Version Control**: All migrations are tracked in git
2. **Run Migrations**: Always use `supabase db reset` not manual SQL
3. **Test Locally**: Test all changes locally before deploying
4. **Backup Before Major Changes**: Use `supabase db dump` before resets

## Summary
The permanent fix ensures that:
- ✅ Triggers are defined in migration files
- ✅ Verification functions check and repair automatically
- ✅ Changes persist through database resets
- ✅ Existing users are fixed retroactively

This approach guarantees that the `on_auth_user_created` trigger and other critical database objects will always be present, even after database resets or new deployments.