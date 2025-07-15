# Complete Stripe Webhook Events Guide for iwishBag

## Current Phase - One-time Payments (Select These Now)

### Core Payment Events
- `payment_intent.succeeded` ✅
- `payment_intent.payment_failed` ✅
- `payment_intent.canceled` ✅
- `charge.succeeded` ✅
- `charge.failed` ✅
- `charge.refunded` ✅
- `charge.dispute.created` ✅

## Phase 2 - Payment Links (Add When Implementing)

### Payment Link Events
- **`payment_link.created`** - Payment link generated
- **`payment_link.updated`** - Payment link modified
- **`checkout.session.completed`** - Payment via link completed
- **`checkout.session.expired`** - Payment link expired
- **`checkout.session.async_payment_succeeded`** - Async payment completed
- **`checkout.session.async_payment_failed`** - Async payment failed

### Why These Matter
- Track payment link usage and conversion
- Handle async payment methods (bank debits, etc.)
- Monitor link expiration for follow-ups

## Phase 3 - Invoices (Add When Implementing)

### Invoice Events
- **`invoice.created`** - Invoice generated
- **`invoice.finalized`** - Invoice ready to send
- **`invoice.sent`** - Invoice emailed to customer
- **`invoice.paid`** - Invoice payment received
- **`invoice.payment_failed`** - Invoice payment failed
- **`invoice.overdue`** - Invoice past due
- **`invoice.voided`** - Invoice canceled
- **`invoice.marked_uncollectible`** - Invoice written off

### Invoice Item Events
- **`invoiceitem.created`** - Line item added
- **`invoiceitem.updated`** - Line item modified
- **`invoiceitem.deleted`** - Line item removed

### Why These Matter
- Track invoice lifecycle
- Automate follow-ups for overdue invoices
- Sync invoice status with your order system

## Phase 4 - Subscriptions (Add When Implementing)

### Subscription Lifecycle Events
- **`customer.subscription.created`** - New subscription started
- **`customer.subscription.updated`** - Subscription modified
- **`customer.subscription.deleted`** - Subscription canceled
- **`customer.subscription.paused`** - Subscription paused
- **`customer.subscription.resumed`** - Subscription resumed
- **`customer.subscription.trial_will_end`** - Trial ending soon

### Subscription Billing Events
- **`invoice.upcoming`** - Next invoice preview (7 days before)
- **`customer.subscription.pending_update_applied`** - Scheduled changes applied
- **`customer.subscription.pending_update_expired`** - Scheduled changes expired

### Subscription Schedule Events (for complex billing)
- **`subscription_schedule.created`** - Schedule created
- **`subscription_schedule.updated`** - Schedule modified
- **`subscription_schedule.released`** - Schedule activated
- **`subscription_schedule.canceled`** - Schedule canceled

### Why These Matter
- Manage recurring billing cycles
- Handle upgrades/downgrades
- Send renewal reminders
- Track churn and retention

## Additional Events for Full Coverage

### Customer Events (Recommended for All Phases)
- **`customer.created`** - New Stripe customer
- **`customer.updated`** - Customer details changed
- **`customer.deleted`** - Customer removed
- **`payment_method.attached`** - Card/bank saved
- **`payment_method.detached`** - Payment method removed
- **`payment_method.updated`** - Payment method updated

### Advanced Payment Events
- **`setup_intent.succeeded`** - Card saved for future use
- **`setup_intent.setup_failed`** - Card save failed
- **`payment_method.automatically_updated`** - Card auto-updated

### Payout Events (If You Become a Marketplace)
- **`payout.created`** - Payout initiated
- **`payout.paid`** - Payout completed
- **`payout.failed`** - Payout failed

## Recommended Webhook Strategy

### 1. Start Small (Current)
```
payment_intent.* (succeeded, failed, canceled)
charge.* (succeeded, failed, refunded, dispute.created)
```

### 2. Add Payment Links
```
+ payment_link.*
+ checkout.session.*
```

### 3. Add Invoicing
```
+ invoice.* (all invoice events)
+ invoiceitem.*
```

### 4. Add Subscriptions
```
+ customer.subscription.*
+ subscription_schedule.*
```

### 5. Add Customer Management
```
+ customer.*
+ payment_method.*
+ setup_intent.*
```

## Implementation Tips

1. **Use Versioning**: Create separate webhook endpoints for different features
   - `/stripe-webhook` - Core payments
   - `/stripe-webhook-invoices` - Invoice handling
   - `/stripe-webhook-subscriptions` - Subscription management

2. **Event Filtering**: In your webhook handler, filter events by type:
   ```typescript
   switch (event.type) {
     // Payment events
     case 'payment_intent.succeeded':
     case 'charge.succeeded':
       handlePaymentSuccess(event);
       break;
     
     // Invoice events
     case 'invoice.paid':
       handleInvoicePaid(event);
       break;
     
     // Subscription events
     case 'customer.subscription.created':
       handleNewSubscription(event);
       break;
   }
   ```

3. **Idempotency**: Always check if event was already processed
4. **Logging**: Log all webhook events for debugging
5. **Monitoring**: Set up alerts for failed webhooks

## Database Considerations

You'll need additional tables for new features:
- `payment_links` - Track payment link usage
- `invoices` - Mirror Stripe invoices
- `subscriptions` - Track subscription details
- `subscription_items` - Line items in subscriptions
- `webhook_events` - Log all received events

## Security Note

Always verify webhook signatures and use different endpoints/signing secrets for different environments (test/live).