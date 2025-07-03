# 🔗 Payment Webhook Setup Guide

## 📋 Overview

This guide explains how to set up the payment webhook that automatically transitions quotes to orders when payment is received.

## 🚀 Deployment

### 1. Deploy the Webhook Function

```bash
# Deploy the payment webhook function
supabase functions deploy payment-webhook

# Set the webhook secret (get this from Stripe dashboard)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. Configure Stripe Webhook

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Add endpoint**: `https://your-project.supabase.co/functions/v1/payment-webhook`
3. **Select events**:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. **Copy webhook secret** and set it as `STRIPE_WEBHOOK_SECRET`

## 🔄 How It Works

### Automatic Quote to Order Transition

1. **Customer pays** for quote via Stripe
2. **Stripe sends webhook** to our function
3. **Webhook processes** the payment event
4. **Quote status changes** from "approved" to "paid"
5. **Quote disappears** from Quotes page
6. **Order appears** on Orders page
7. **Order display ID** is generated (e.g., "ORD-ABC123")

### Manual Payment Confirmation

For COD and Bank Transfer payments:
1. **Admin goes to Orders page**
2. **Finds pending payment** (status: "cod_pending" or "bank_transfer_pending")
3. **Clicks "Confirm Payment Received"**
4. **Status changes** to "paid"
5. **Quote moves** to Orders page

## 📊 Status Flow

### Quote Statuses (Quotes Page)
- `pending` → Initial quote request
- `sent` → Quote sent to customer
- `approved` → Customer approved quote
- `rejected` → Quote rejected
- `expired` → Quote expired

### Order Statuses (Orders Page)
- `paid` → Payment received
- `ordered` → Order placed with merchant
- `shipped` → Order shipped
- `completed` → Order delivered
- `cancelled` → Order cancelled

## 🛠️ Testing

### Test Webhook Locally

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:54321/functions/v1/payment-webhook

# Test with sample event
stripe trigger checkout.session.completed
```

### Test Payment Flow

1. **Create a test quote** with status "approved"
2. **Process payment** through Stripe
3. **Check webhook logs** in Supabase dashboard
4. **Verify quote moved** to Orders page
5. **Confirm status transition** was logged

## 🔍 Monitoring

### Check Webhook Logs

```bash
# View function logs
supabase functions logs payment-webhook

# Check status transitions
SELECT * FROM status_transitions WHERE trigger = 'payment_received';
```

### Common Issues

1. **Webhook not receiving events**
   - Check webhook endpoint URL
   - Verify webhook secret
   - Check function deployment

2. **Quote not moving to Orders**
   - Verify quote status is "approved"
   - Check webhook logs for errors
   - Confirm database permissions

3. **Payment transaction not created**
   - Check payment_transactions table
   - Verify webhook payload
   - Review function logs

## 🔧 Configuration

### Environment Variables

```bash
# Required
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Database Tables

The webhook uses these tables:
- `quotes` - Updates status and adds order_display_id
- `status_transitions` - Logs status changes
- `payment_transactions` - Records payment details

## 📈 Benefits

✅ **Automatic workflow** - No manual intervention needed
✅ **Real-time updates** - Instant status changes
✅ **Complete audit trail** - All transitions logged
✅ **Error handling** - Robust failure recovery
✅ **Scalable** - Handles multiple payments simultaneously

## 🚨 Security

- **Webhook signature verification** prevents spoofing
- **Service role key** for database access
- **HTTPS endpoints** only
- **Environment variable protection**
- **Error logging** for debugging

## 📞 Support

If you encounter issues:
1. Check function logs
2. Verify webhook configuration
3. Test with Stripe CLI
4. Review database permissions
5. Check environment variables 