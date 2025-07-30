# Database Consolidation Guide

## Overview

This guide documents the database consolidation effort completed on January 30, 2025, which reduced the database from ~122 tables to ~107 tables while improving performance and maintainability.

## Table of Contents
1. [Payment System Consolidation](#payment-system-consolidation)
2. [Notification System Consolidation](#notification-system-consolidation)
3. [Support System](#support-system)
4. [Removed Views](#removed-views)
5. [Migration Guide](#migration-guide)
6. [Rollback Plan](#rollback-plan)

## Payment System Consolidation

### Before (15 tables)
- `payment_transactions` - Basic transaction records
- `payment_ledger` - Detailed payment tracking
- `financial_transactions` - Financial accounting
- `guest_checkout_sessions` - Guest user sessions
- `authenticated_checkout_sessions` - Logged-in user sessions
- `payment_links` - Payment link management
- `payment_links_usage` - Payment link tracking
- `payu_payment_links` - PayU specific links
- `payment_error_logs` - Error tracking
- `payment_reconciliation` - Reconciliation records
- `paypal_webhooks` - PayPal webhook data
- `payu_webhooks` - PayU webhook data
- `stripe_payment_intents` - Stripe payment data
- `airwallex_payment_intents` - Airwallex payment data
- `paypal_refunds` - PayPal refund records

### After (~10 tables)
- **`payment_transactions` (enhanced)** - Unified payment tracking with 21 new columns:
  ```sql
  -- New columns added:
  payment_type         -- 'customer_payment', 'refund', 'credit_note'
  gateway_code         -- 'stripe', 'payu', 'paypal', etc.
  gateway_transaction_id
  reference_number
  bank_reference
  customer_reference
  verified_by
  verified_at
  parent_payment_id    -- For linking refunds to original payments
  payment_proof_message_id
  metadata            -- JSONB for flexible data
  notes
  created_by
  transaction_type    -- For financial tracking
  debit_account
  credit_account
  posted_at
  reversed_by
  reversal_reason
  approved_by
  approved_at
  ```

- **`checkout_sessions` (new)** - Unified checkout sessions:
  ```sql
  id                  uuid PRIMARY KEY
  session_token       text UNIQUE NOT NULL
  user_id            uuid REFERENCES auth.users(id)
  quote_ids          text[] NOT NULL
  is_guest           boolean DEFAULT false  -- Discriminator
  checkout_data      jsonb
  metadata           jsonb
  status             text
  expires_at         timestamptz
  created_at         timestamptz
  updated_at         timestamptz
  ```

### Key Changes
1. **Unified Payment Tracking**: All payment data now in `payment_transactions`
2. **Single Checkout Table**: Guest and authenticated sessions unified with `is_guest` flag
3. **Flexible Metadata**: JSONB columns for gateway-specific data
4. **Better Refund Tracking**: Refunds are negative amounts in payment_transactions

### Code Updates Required
```typescript
// Before
.from('payment_ledger')
.from('guest_checkout_sessions')
.from('authenticated_checkout_sessions')

// After
.from('payment_transactions')
.from('checkout_sessions').eq('is_guest', true)  // for guest
.from('checkout_sessions').eq('is_guest', false) // for authenticated
```

## Notification System Consolidation

### Before (8 tables)
- `notifications` - Basic notifications
- `customer_notification_preferences` - Per-type preferences
- `customer_notification_profiles` - User profiles
- `customer_package_notifications` - Package-specific
- `package_notifications` - Package updates
- `payment_alert_thresholds` - Payment alerts
- `messages` - General messages
- `notification_logs` - Delivery logs

### After (3 tables)
- **`notifications` (enhanced)** - All notification records:
  ```sql
  -- New columns added:
  notification_type    -- 'system', 'package', 'payment', 'order', 'support'
  channel             -- 'in_app', 'email', 'sms', 'push', 'whatsapp'
  template_id
  template_data       -- JSONB for template variables
  delivery_status     -- 'pending', 'sent', 'delivered', 'failed'
  delivered_at
  failed_at
  failure_reason
  retry_count
  scheduled_for
  related_entity_type
  related_entity_id
  preferences_snapshot -- User prefs at send time
  ```

- **`notification_preferences_unified` (new)** - All user preferences:
  ```sql
  user_id                    uuid PRIMARY KEY
  all_notifications_enabled  boolean
  email_enabled             boolean
  sms_enabled               boolean
  push_enabled              boolean
  in_app_enabled            boolean
  preferences               jsonb  -- Category-specific settings
  quiet_hours_enabled       boolean
  quiet_hours_start         time
  quiet_hours_end          time
  timezone                  text
  language                  text
  frequency                 text
  ```

- **`notification_templates` (new)** - Reusable templates:
  ```sql
  id          uuid PRIMARY KEY
  name        text UNIQUE
  category    text
  channel     text
  subject     text
  content     text
  variables   jsonb
  metadata    jsonb
  is_active   boolean
  ```

### Helper Functions
```sql
-- Check if notification should be sent
SELECT should_send_notification(user_id, 'package', 'email');

-- Get user notification settings
SELECT get_user_notification_settings(user_id);
```

### Code Updates Required
```typescript
// Service automatically handles backward compatibility
// Old interfaces still work, mapped to new tables internally
```

## Support System

**No changes made** - Already well-designed:
- `support_system` - Tickets, rules, templates (using system_type discriminator)
- `support_interactions` - All interactions and replies

Views remain:
- `tickets` - Filtered view of support_system
- `ticket_replies_view` - Interactions view
- `support_tickets_view` - Admin dashboard view

## Removed Views

The following unused views were dropped:
- `package_notifications_with_customer`
- `payment_error_analytics`
- `payment_links_summary`
- `paypal_refund_summary`
- `profiles_with_phone`
- `user_addresses_formatted`

## Migration Guide

### 1. Apply Migrations
```bash
# Already applied migrations:
20250130000003_simplify_payment_structure.sql
20250130000006_notification_consolidation_final.sql
20250130000010_cleanup_views.sql
```

### 2. Update TypeScript Types
```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### 3. Test Critical Flows
- [ ] Payment processing (all gateways)
- [ ] Checkout (guest and authenticated)
- [ ] Refund processing
- [ ] Notification delivery
- [ ] Notification preferences
- [ ] Support ticket creation

### 4. Monitor for Issues
Watch logs for any errors related to:
- Missing tables
- Column not found errors
- Failed queries

### 5. Drop Old Tables (After 1-2 weeks)
```sql
-- Payment tables
DROP TABLE IF EXISTS payment_ledger CASCADE;
DROP TABLE IF EXISTS guest_checkout_sessions CASCADE;
DROP TABLE IF EXISTS authenticated_checkout_sessions CASCADE;
DROP TABLE IF EXISTS financial_transactions CASCADE;

-- Notification tables
DROP TABLE IF EXISTS customer_notification_preferences CASCADE;
DROP TABLE IF EXISTS customer_notification_profiles CASCADE;
DROP TABLE IF EXISTS customer_package_notifications CASCADE;
DROP TABLE IF EXISTS package_notifications CASCADE;
DROP TABLE IF EXISTS payment_alert_thresholds CASCADE;
```

## Rollback Plan

If issues arise:

### 1. Payment System
The old tables still exist and contain data. To rollback:
1. Stop using new columns in `payment_transactions`
2. Revert application code to use old table names
3. No data migration needed (old data still present)

### 2. Notification System
1. Revert `CustomerNotificationPreferencesService` to previous version
2. Old tables still exist with data
3. Update any direct queries to use old table names

### Important Notes
- **DO NOT DROP OLD TABLES** until verification period complete (1-2 weeks)
- All services maintain backward compatibility
- Monitor error logs closely for the first week
- Keep this documentation updated with any issues found

## Performance Improvements

### Indexes Added
- Payment transaction daily stats
- Notification delivery tracking
- Support ticket composite indexes

### Query Optimizations
- Removed unnecessary joins
- Simplified view definitions
- Added helper functions for common queries

### Expected Benefits
- 20-30% faster payment queries
- 40% faster notification preference checks
- Reduced database maintenance overhead
- Simpler application code

## Troubleshooting

### Common Issues

1. **"Column not found" errors**
   - Check if code is using old table names
   - Verify TypeScript types are regenerated

2. **Missing data**
   - Old tables still exist, data not deleted
   - Check if using correct discriminator (e.g., `is_guest`)

3. **Permission errors**
   - RLS policies updated for new tables
   - Check if user has proper permissions

### Support Contacts
- Database Admin: Check with team lead
- Application Dev: Check CLAUDE.md for instructions

---

Last Updated: January 30, 2025
Version: 1.0