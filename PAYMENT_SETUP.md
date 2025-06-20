# 🚀 Payment Gateway Setup Guide

## 📋 Overview

This guide will help you set up the complete payment gateway system for Global Wishlist Hub, including all payment methods for Nepal, India, and international customers.

## 🔧 Environment Variables Setup

Add these environment variables to your `.env` file:

### **Stripe (International)**
```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

### **PayU (India)**
```bash
PAYU_MERCHANT_KEY=your_payu_merchant_key
PAYU_SALT_KEY=your_payu_salt_key
PAYU_MERCHANT_ID=your_payu_merchant_id
PAYU_PAYMENT_URL=https://test.payu.in/_payment
```

### **eSewa (Nepal)**
```bash
ESEWA_MERCHANT_ID=your_esewa_merchant_id
ESEWA_MERCHANT_KEY=your_esewa_merchant_key
```

### **Khalti (Nepal)**
```bash
KHALTI_PUBLIC_KEY=your_khalti_public_key
KHALTI_SECRET_KEY=your_khalti_secret_key
```

### **Fonepay (Nepal)**
```bash
FONEPAY_MERCHANT_ID=your_fonepay_merchant_id
FONEPAY_MERCHANT_KEY=your_fonepay_merchant_key
```

### **Airwallex (International)**
```bash
AIRWALLEX_API_KEY=your_airwallex_api_key
AIRWALLEX_CLIENT_ID=your_airwallex_client_id
AIRWALLEX_PAYMENT_URL=https://checkout.airwallex.com
```

## 🗄️ Database Migration

Run the payment gateway migration:

```bash
# Deploy the migration to Supabase
supabase db push

# Or run manually in Supabase dashboard
# Copy and paste the contents of: supabase/migrations/20250102000000_payment_gateways.sql
```

## 🚀 Deploy Payment Function

Deploy the payment function to Supabase:

```bash
# Deploy the create-payment function
supabase functions deploy create-payment

# Set function secrets (if needed)
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key
supabase secrets set PAYU_MERCHANT_KEY=your_payu_key
# ... add other secrets as needed
```

## 🧪 Testing Setup

### **1. Test Accounts Setup**

#### **Stripe Test Cards**
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Expiry**: Any future date
- **CVC**: Any 3 digits

#### **PayU Test Data**
- **Test Mode**: Enable in PayU dashboard
- **Test Cards**: Use PayU test card numbers
- **UPI**: Use test UPI IDs

#### **Nepal Payment Methods**
- **eSewa**: Use test merchant credentials
- **Khalti**: Use test public/secret keys
- **Fonepay**: Use test merchant credentials

### **2. Test Scenarios**

#### **Country-Based Testing**
```bash
# Test Nepal payments
1. Set user country to 'NP'
2. Verify eSewa, Khalti, Fonepay appear
3. Test QR code generation
4. Test mobile app integration

# Test India payments
1. Set user country to 'IN'
2. Verify PayU appears
3. Test UPI integration
4. Test card payments

# Test International payments
1. Set user country to 'US' or other
2. Verify Stripe/Airwallex appear
3. Test card payments
4. Test currency conversion
```

#### **Payment Flow Testing**
```bash
# Test successful payment
1. Create quote
2. Select payment method
3. Complete payment
4. Verify order confirmation

# Test failed payment
1. Use declined test card
2. Verify error handling
3. Check fallback options

# Test QR payments
1. Select mobile payment method
2. Verify QR code generation
3. Test mobile app scanning
4. Verify payment completion
```

## 🔍 Admin Panel Setup

### **1. Access Payment Management**
- Navigate to Admin Dashboard
- Go to "Payment Gateway Management"
- Configure gateway settings

### **2. Configure Gateways**
```bash
# For each gateway:
1. Set API keys in environment variables
2. Configure supported countries
3. Set fee percentages
4. Enable/disable as needed
5. Switch between test/live modes
```

### **3. Monitor Analytics**
- View payment analytics dashboard
- Monitor gateway performance
- Track success rates
- Export transaction data

## 🛡️ Security Considerations

### **1. API Key Security**
```bash
# Never commit API keys to git
# Use environment variables
# Rotate keys regularly
# Use test keys for development
```

### **2. Webhook Security**
```bash
# Verify webhook signatures
# Use HTTPS endpoints
# Implement retry logic
# Monitor webhook failures
```

### **3. PCI Compliance**
```bash
# Don't store card data
# Use tokenization
# Implement proper encryption
# Regular security audits
```

## 🔄 Webhook Setup

### **1. Stripe Webhooks**
```bash
# Endpoint: https://your-domain.com/functions/v1/stripe-webhook
# Events: payment_intent.succeeded, payment_intent.payment_failed
```

### **2. PayU Webhooks**
```bash
# Endpoint: https://your-domain.com/functions/v1/payu-webhook
# Events: payment.success, payment.failure
```

### **3. Nepal Payment Webhooks**
```bash
# eSewa: Configure in merchant dashboard
# Khalti: Configure in merchant dashboard
# Fonepay: Configure in merchant dashboard
```

## 📱 Mobile App Integration

### **1. QR Code Generation**
```bash
# QR codes are generated automatically
# Include payment details in QR data
# Support multiple QR formats
# Provide download option
```

### **2. App Store Links**
```bash
# eSewa: https://play.google.com/store/apps/details?id=com.esewa.android
# Khalti: https://play.google.com/store/apps/details?id=com.khalti.customer
# Fonepay: https://play.google.com/store/apps/details?id=com.fonepay.customer
```

## 🚨 Troubleshooting

### **Common Issues**

#### **1. Payment Function Not Found**
```bash
# Solution: Deploy the function
supabase functions deploy create-payment
```

#### **2. Environment Variables Missing**
```bash
# Solution: Add all required variables
# Check .env file
# Restart development server
```

#### **3. QR Code Not Generating**
```bash
# Solution: Check QR service URL
# Verify payment data format
# Test QR code generation
```

#### **4. Payment Status Not Updating**
```bash
# Solution: Check webhook configuration
# Verify webhook endpoints
# Monitor webhook logs
```

### **Debug Mode**
```bash
# Enable debug logging
# Check browser console
# Monitor network requests
# Review Supabase logs
```

## 📊 Monitoring & Analytics

### **1. Payment Metrics**
- Total transactions
- Success rates
- Average amounts
- Gateway performance

### **2. Error Tracking**
- Failed payments
- Webhook failures
- Gateway errors
- User feedback

### **3. Performance Monitoring**
- Response times
- Gateway availability
- Currency conversion rates
- Mobile payment success

## 🎯 Go-Live Checklist

### **Pre-Launch**
- [ ] All environment variables set
- [ ] Database migration completed
- [ ] Payment function deployed
- [ ] Test payments working
- [ ] Webhooks configured
- [ ] Admin panel configured

### **Launch Day**
- [ ] Switch to live API keys
- [ ] Monitor first payments
- [ ] Verify webhook processing
- [ ] Check error rates
- [ ] Test customer support

### **Post-Launch**
- [ ] Monitor analytics daily
- [ ] Review error logs
- [ ] Optimize performance
- [ ] Gather user feedback
- [ ] Plan improvements

## 📞 Support

### **Payment Gateway Support**
- **Stripe**: https://support.stripe.com
- **PayU**: https://payu.in/support
- **eSewa**: https://esewa.com.np/support
- **Khalti**: https://khalti.com/support
- **Fonepay**: https://fonepay.com/support
- **Airwallex**: https://airwallex.com/support

### **Technical Support**
- Check Supabase documentation
- Review function logs
- Monitor webhook delivery
- Test with different scenarios

---

## 🎉 Success!

Your payment gateway system is now ready to handle payments from customers worldwide with support for:

- ✅ **Nepal**: eSewa, Khalti, Fonepay
- ✅ **India**: PayU
- ✅ **International**: Stripe, Airwallex
- ✅ **Universal**: Bank Transfer, COD

The system automatically detects user location and shows appropriate payment methods, handles QR codes for mobile payments, and provides comprehensive admin controls for monitoring and management. 