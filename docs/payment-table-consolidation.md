# Payment Table Consolidation Guide

## Overview
This migration consolidates 15 payment-related tables down to ~10 by merging redundant tables and removing unnecessary ones.

## Tables Being Consolidated

### 1. **Payment Transactions** (3 → 1)
- `payment_transactions` (keep as main table)
- `payment_ledger` → merge into payment_transactions
- `financial_transactions` → merge into payment_transactions

**Result**: Single `payment_transactions` table with all fields

### 2. **Checkout Sessions** (2 → 1)
- `authenticated_checkout_sessions` → rename to `checkout_sessions`
- `guest_checkout_sessions` → merge into checkout_sessions with `is_guest` flag

**Result**: Single `checkout_sessions` table

### 3. **Refunds** (2 → 1)
- `gateway_refunds` (keep as main table)
- `paypal_refunds` → merge into gateway_refunds with `gateway_type` field

**Result**: Single `gateway_refunds` table with gateway-specific data in metadata

## Migration Steps

### Step 1: Apply Database Migration
```bash
# Review the migration file first
cat supabase/migrations/20250130000000_consolidate_payment_tables.sql

# Apply the migration
supabase db push

# Verify migration
psql -c "SELECT * FROM schema_migrations WHERE migration_name LIKE '%payment%';"
```

### Step 2: Update TypeScript Types
```bash
# Regenerate types after migration
npm run supabase:generate-types
```

### Step 3: Update Application Code
```bash
# Run the automated code update script
npx ts-node scripts/update-payment-code-references.ts

# Run type checking
npm run typecheck
```

### Step 4: Test Payment Flows
1. Test regular payment processing
2. Test guest checkout
3. Test authenticated checkout
4. Test refund processing
5. Test PayPal-specific flows

### Step 5: Clean Up Old Tables (After Verification)
```sql
-- Only run after thorough testing!
DROP TABLE IF EXISTS payment_ledger CASCADE;
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS guest_checkout_sessions CASCADE;
DROP TABLE IF EXISTS paypal_refunds CASCADE;
DROP TABLE IF EXISTS paypal_refund_reasons CASCADE;

-- Drop backup tables
DROP TABLE IF EXISTS payment_transactions_backup;
DROP TABLE IF EXISTS payment_ledger_backup;
DROP TABLE IF EXISTS financial_transactions_backup;
```

## Code Changes Required

### 1. Service Updates
- `PaymentService`: Update to use consolidated payment_transactions
- `CheckoutSessionService`: Update for unified checkout_sessions
- `RefundProcessingService`: Update for consolidated refunds

### 2. Query Updates
```typescript
// Before
const ledgerEntry = await supabase
  .from('payment_ledger')
  .insert({...});

// After
const ledgerEntry = await supabase
  .from('payment_transactions')
  .insert({...});

// Before - Guest checkout
const guestSession = await supabase
  .from('guest_checkout_sessions')
  .select();

// After - Guest checkout
const guestSession = await supabase
  .from('checkout_sessions')
  .select()
  .eq('is_guest', true);
```

### 3. Type Updates
```typescript
// Before
type PaymentLedger = Tables<'payment_ledger'>;
type GuestCheckout = Tables<'guest_checkout_sessions'>;

// After
type PaymentTransaction = Tables<'payment_transactions'>;
type CheckoutSession = Tables<'checkout_sessions'> & {
  is_guest: boolean;
};
```

## Benefits
1. **Reduced Complexity**: From 15 to ~10 payment tables
2. **Better Performance**: Fewer joins needed
3. **Easier Maintenance**: Single source of truth for payments
4. **Cleaner Schema**: Logical grouping of related data

## Rollback Plan
If issues arise, use the backup tables created during migration:
```sql
-- Restore from backups
BEGIN;
DROP TABLE IF EXISTS payment_transactions CASCADE;
CREATE TABLE payment_transactions AS SELECT * FROM payment_transactions_backup;
-- Continue for other tables...
COMMIT;
```

## Monitoring
After migration, monitor:
1. Payment success rates
2. Checkout completion rates
3. Refund processing times
4. Any new errors in logs

## Next Tables to Consolidate
1. Support system tables (5 → 2-3)
2. Notification tables (5 → 2-3)
3. Remove unnecessary views (4 views)