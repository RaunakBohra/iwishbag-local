# Stripe Webhook Events for iwishBag

## Essential Events (Must Have)

### Payment Intent Events
- **`payment_intent.succeeded`** ✅ - Payment completed successfully
- **`payment_intent.payment_failed`** ✅ - Payment failed
- **`payment_intent.canceled`** ✅ - Payment was canceled

### Charge Events (for additional details)
- **`charge.succeeded`** - Charge was successful (includes receipt URL)
- **`charge.failed`** - Charge failed (includes failure reason)
- **`charge.refunded`** - Refund processed
- **`charge.dispute.created`** - Customer disputed a charge

## Recommended Events

### Customer & Payment Method Events
- **`customer.created`** - New customer created
- **`customer.updated`** - Customer details updated
- **`payment_method.attached`** - Payment method saved
- **`payment_method.detached`** - Payment method removed

### Refund Events
- **`refund.created`** - Refund initiated
- **`refund.updated`** - Refund status changed
- **`charge.refund.updated`** - Refund details updated

### Dispute/Chargeback Events
- **`charge.dispute.created`** - Customer filed a dispute
- **`charge.dispute.updated`** - Dispute status changed
- **`charge.dispute.closed`** - Dispute resolved

## Optional Events (Nice to Have)

### Checkout Session Events (if using Stripe Checkout)
- **`checkout.session.completed`** - Checkout completed
- **`checkout.session.expired`** - Checkout session expired

### Invoice Events (if using Stripe Invoicing)
- **`invoice.paid`** - Invoice was paid
- **`invoice.payment_failed`** - Invoice payment failed

### Radar Events (Fraud Detection)
- **`radar.early_fraud_warning.created`** - Potential fraud detected

## Events to Skip (Not Needed)

- Balance events
- Payout events (unless you're a marketplace)
- Subscription events (unless you have subscriptions)
- Connect events (unless you're a platform)
- Tax events (handled differently in your system)

## Minimum Required for iwishBag

At minimum, select these 7 events:
1. `payment_intent.succeeded`
2. `payment_intent.payment_failed`
3. `payment_intent.canceled`
4. `charge.succeeded`
5. `charge.failed`
6. `charge.refunded`
7. `charge.dispute.created`

## Setting Up in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Enter URL: `https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/stripe-webhook`
4. Select the events listed above
5. Copy the signing secret (starts with `whsec_`)

## Why These Events?

- **Payment Intent events**: Core payment status tracking
- **Charge events**: Additional details like receipt URLs and refunds
- **Dispute events**: Critical for handling chargebacks
- **Customer events**: Optional but useful for tracking customer data

These events cover the complete payment lifecycle from initiation to potential disputes/refunds.