# Fonepay QR Payment Integration - Complete Implementation Plan

## Table of Contents
1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Integration Architecture](#integration-architecture)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Database Configuration](#database-configuration)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Testing Guide](#testing-guide)
9. [Production Deployment](#production-deployment)
10. [Security Considerations](#security-considerations)

---

## Overview

This document provides a comprehensive plan for integrating Fonepay QR payment system into the iwishBag e-commerce platform. Fonepay is a popular digital payment system in Nepal that supports QR code payments.

### **Your Fonepay Credentials**
```
Pan Number: 603854741
Merchant Code: 2222050014849742
Secret Key: dd3f7d1be3ad401a84b374aca469aa48
```

### **Fonepay Payment Flow**
1. **Payment Request**: Redirect user to Fonepay with payment parameters
2. **QR Code Display**: Fonepay shows QR code for customer to scan
3. **Payment Processing**: Customer pays using mobile app
4. **Response Handling**: Fonepay redirects back with payment status
5. **Verification**: Validate payment response using HMAC-SHA512

---

## System Requirements

### **Technical Stack**
- **Frontend**: React 18 with TypeScript
- **Backend**: Supabase Edge Functions (Deno)
- **Database**: PostgreSQL with payment_gateways table
- **Hash Algorithm**: HMAC-SHA512 for secure verification

### **Dependencies**
- Crypto API for hash generation
- QR code modal component (already exists)
- Payment status tracking system

---

## Integration Architecture

### **Components Overview**
```
Frontend (React)
├── Checkout Page (payment initiation)
├── QR Payment Modal (already exists)
├── Payment Success/Failure Pages
└── Payment Status Tracker

Backend (Supabase)
├── create-payment Edge Function
├── fonepay-webhook Edge Function (new)
├── payment verification logic
└── transaction status updates

Database
├── payment_gateways (Fonepay config)
├── quotes (order management)
└── payment_transactions (tracking)
```

### **Data Flow**
```
1. User clicks "Pay with Fonepay"
2. Frontend → create-payment Edge Function
3. Edge Function → Generate HMAC hash
4. Edge Function → Redirect to Fonepay
5. Fonepay → Show QR code
6. Customer → Scan QR and pay
7. Fonepay → Redirect to success/failure URL
8. Webhook → Verify payment and update status
```

---

## Step-by-Step Implementation

### **Phase 1: Database Setup**
### **Phase 2: Backend Edge Functions**
### **Phase 3: Frontend Integration**
### **Phase 4: Testing & Deployment**

---

## Database Configuration

### Step 1: Update Fonepay Gateway Configuration

```sql
-- Update Fonepay configuration with your credentials
UPDATE payment_gateways 
SET config = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(config, '{merchant_code}', '"2222050014849742"'),
      '{pan_number}', '"603854741"'
    ),
    '{secret_key}', '"dd3f7d1be3ad401a84b374aca469aa48"'
  ),
  '{environment}', '"test"'
),
test_mode = true,
enabled = true
WHERE code = 'fonepay';
```

### Step 2: Verify Configuration

```sql
-- Check Fonepay gateway configuration
SELECT 
  code,
  name,
  enabled,
  test_mode,
  config->>'merchant_code' as merchant_code,
  config->>'pan_number' as pan_number,
  config->>'environment' as environment
FROM payment_gateways 
WHERE code = 'fonepay';
```

### Step 3: Create Payment Transactions Table (if needed)

```sql
-- Create table to track Fonepay transactions
CREATE TABLE IF NOT EXISTS fonepay_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prn VARCHAR(25) NOT NULL UNIQUE, -- Product Reference Number
  quote_id UUID REFERENCES quotes(id),
  merchant_code VARCHAR(20) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NPR',
  status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
  fonepay_uid VARCHAR(50), -- Fonepay Trace ID
  bank_code VARCHAR(10), -- Bank Swift Code
  initiator VARCHAR(20), -- User who made payment
  paid_amount DECIMAL(18,2), -- Actual amount paid
  requested_amount DECIMAL(18,2), -- Amount requested
  payment_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Backend Implementation

### Step 1: Create Fonepay Payment Logic in Edge Function

```typescript
// File: supabase/functions/create-payment/index.ts
// Add this case to the switch statement

case 'fonepay':
  try {
    console.log('💳 Starting Fonepay payment creation');
    
    // Fetch Fonepay config from database
    const { data: fonepayGateway, error: fonepayGatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'fonepay')
      .single();

    if (fonepayGatewayError || !fonepayGateway) {
      console.error('❌ Fonepay gateway config error:', fonepayGatewayError);
      return new Response(JSON.stringify({ error: 'Fonepay gateway config missing' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const fonepayConfig = fonepayGateway.config || {};
    const fonepayTestMode = fonepayGateway.test_mode;
    
    // Extract configuration
    const merchantCode = fonepayConfig.merchant_code;
    const secretKey = fonepayConfig.secret_key;
    const panNumber = fonepayConfig.pan_number;
    
    if (!merchantCode || !secretKey) {
      return new Response(JSON.stringify({ error: 'Fonepay configuration incomplete' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate unique Product Reference Number (PRN)
    const prn = `FONEPAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Fonepay payment parameters
    const paymentParams = {
      PID: merchantCode,
      MD: 'P', // Payment mode
      PRN: prn,
      AMT: totalAmount.toString(),
      CRN: 'NPR', // Currency (Nepal Rupees)
      DT: new Date().toLocaleDateString('en-US'), // MM/DD/YYYY format
      R1: `iWishBag Order - ${quoteIds.join(',')}`,
      R2: customerInfo?.name || 'Customer',
      RU: `${window.location.origin}/payment-callback/fonepay` // Return URL
    };

    // Generate HMAC-SHA512 hash for security
    const hashString = [
      paymentParams.PID,
      paymentParams.MD,
      paymentParams.PRN,
      paymentParams.AMT,
      paymentParams.CRN,
      paymentParams.DT,
      paymentParams.R1,
      paymentParams.R2,
      paymentParams.RU
    ].join(',');

    console.log('🔐 Fonepay hash string:', hashString);

    // Generate HMAC-SHA512 hash
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(hashString);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    paymentParams.DV = hashHex;

    console.log('✅ Fonepay hash generated:', hashHex.substring(0, 20) + '...');

    // Store transaction in database
    const { error: transactionError } = await supabaseAdmin
      .from('fonepay_transactions')
      .insert({
        prn: prn,
        quote_id: quoteIds[0], // Primary quote
        merchant_code: merchantCode,
        amount: totalAmount,
        currency: 'NPR',
        status: 'pending',
        requested_amount: totalAmount
      });

    if (transactionError) {
      console.error('Error storing Fonepay transaction:', transactionError);
    }

    // Build Fonepay payment URL
    const fonepayUrl = fonepayTestMode 
      ? 'https://dev-clientapi.fonepay.com/api/merchantRequest'
      : 'https://clientapi.fonepay.com/api/merchantRequest';

    // Convert parameters to URL query string
    const queryParams = new URLSearchParams();
    Object.entries(paymentParams).forEach(([key, value]) => {
      queryParams.append(key, value);
    });

    const paymentUrl = `${fonepayUrl}?${queryParams.toString()}`;

    console.log('🚀 Fonepay payment URL generated');

    responseData = {
      success: true,
      url: paymentUrl,
      method: 'GET',
      transactionId: prn,
      gateway: 'fonepay',
      qrCode: paymentUrl, // Fonepay will generate QR code
      amount: totalAmount,
      currency: 'NPR'
    };

  } catch (error) {
    console.error('Fonepay payment creation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Fonepay payment creation failed', 
      details: error.message 
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
  }
  break;
```

### Step 2: Create Fonepay Webhook Handler

```typescript
// File: supabase/functions/fonepay-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse query parameters from Fonepay response
    const url = new URL(req.url);
    const params = url.searchParams;

    const responseData = {
      PRN: params.get('PRN'),
      PID: params.get('PID'),
      PS: params.get('PS') === 'true',
      RC: params.get('RC'),
      DV: params.get('DV'),
      UID: params.get('UID'),
      BC: params.get('BC'),
      INI: params.get('INI'),
      P_AMT: parseFloat(params.get('P_AMT') || '0'),
      R_AMT: parseFloat(params.get('R_AMT') || '0')
    };

    console.log('📥 Fonepay webhook received:', responseData);

    // Verify the response hash
    const { data: gatewayConfig } = await supabaseAdmin
      .from('payment_gateways')
      .select('config')
      .eq('code', 'fonepay')
      .single();

    if (!gatewayConfig) {
      throw new Error('Fonepay gateway config not found');
    }

    const secretKey = gatewayConfig.config.secret_key;
    
    // Generate verification hash
    const verificationString = [
      responseData.PRN,
      responseData.PID,
      responseData.PS,
      responseData.RC,
      responseData.UID,
      responseData.BC,
      responseData.INI,
      responseData.P_AMT,
      responseData.R_AMT
    ].join(',');

    console.log('🔐 Verification string:', verificationString);

    // Generate HMAC-SHA512 for verification
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const messageData = encoder.encode(verificationString);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    
    const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log('🔍 Calculated hash:', calculatedHash);
    console.log('🔍 Received hash:', responseData.DV);

    // Verify hash matches
    if (calculatedHash.toLowerCase() !== responseData.DV?.toLowerCase()) {
      console.error('❌ Hash verification failed');
      return new Response(JSON.stringify({ error: 'Invalid hash verification' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Hash verification passed');

    // Update transaction status
    const paymentStatus = responseData.PS ? 'success' : 'failed';
    
    const { error: updateError } = await supabaseAdmin
      .from('fonepay_transactions')
      .update({
        status: paymentStatus,
        fonepay_uid: responseData.UID,
        bank_code: responseData.BC,
        initiator: responseData.INI,
        paid_amount: responseData.P_AMT,
        payment_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('prn', responseData.PRN);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
    }

    // Update quote status if payment successful
    if (responseData.PS) {
      const { data: transaction } = await supabaseAdmin
        .from('fonepay_transactions')
        .select('quote_id')
        .eq('prn', responseData.PRN)
        .single();

      if (transaction?.quote_id) {
        await supabaseAdmin
          .from('quotes')
          .update({
            status: 'paid',
            payment_method: 'fonepay',
            payment_status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.quote_id);
      }
    }

    // Redirect to success or failure page
    const redirectUrl = responseData.PS
      ? `/payment-success?gateway=fonepay&txn=${responseData.PRN}`
      : `/payment-failure?gateway=fonepay&txn=${responseData.PRN}`;

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    });

  } catch (error) {
    console.error('Fonepay webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

---

## Frontend Implementation

### Step 1: Update Checkout Page

```typescript
// File: src/pages/Checkout.tsx
// Add this to the payment handling logic

else if (paymentMethod === 'fonepay') {
  // Fonepay QR payment - redirect to Fonepay
  console.log('🎯 Fonepay QR payment initiated');
  
  if (paymentResponse.url) {
    // Redirect to Fonepay payment page
    window.location.href = paymentResponse.url;
  } else if (paymentResponse.qrCode) {
    // Show QR code modal if available
    setShowQRModal(true);
    setQRModalData({
      qrCodeUrl: paymentResponse.qrCode,
      transactionId: paymentResponse.transactionId,
      amount: totalAmount,
      currency: 'NPR',
      gateway: 'fonepay'
    });
  }
}
```

### Step 2: Update Payment Gateway Configuration

```typescript
// File: src/hooks/usePaymentGateways.ts
// Update the requiresQRCode function

export const requiresQRCode = (gateway: PaymentGateway): boolean => {
  return ['esewa', 'khalti', 'fonepay'].includes(gateway);
};

export const isMobileOnlyPayment = (gateway: PaymentGateway): boolean => {
  return ['esewa', 'khalti', 'fonepay'].includes(gateway);
};
```

### Step 3: Update Payment Success/Failure Pages

```typescript
// File: src/pages/PaymentSuccess.tsx
// Add Fonepay handling

useEffect(() => {
  const gateway = searchParams.get('gateway');
  const txnId = searchParams.get('txn');
  
  if (gateway === 'fonepay' && txnId) {
    // Handle Fonepay success
    console.log('✅ Fonepay payment successful:', txnId);
    
    // Update order status
    toast.success('Payment successful via Fonepay!');
    
    // Redirect to order confirmation
    navigate(`/order-confirmation?txn=${txnId}`);
  }
}, [searchParams]);
```

### Step 4: Create Fonepay Callback Handler

```typescript
// File: src/pages/PaymentCallback.tsx
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

export const FonepayCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleFonepayCallback = async () => {
      const params = Object.fromEntries(searchParams.entries());
      
      console.log('📥 Fonepay callback received:', params);
      
      try {
        // Call webhook handler to verify and process payment
        const response = await fetch('/api/fonepay-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        });

        if (response.ok) {
          const paymentStatus = params.PS === 'true';
          
          if (paymentStatus) {
            toast({
              title: 'Payment Successful',
              description: 'Your Fonepay payment has been processed successfully.',
            });
            navigate(`/payment-success?gateway=fonepay&txn=${params.PRN}`);
          } else {
            toast({
              title: 'Payment Failed',
              description: 'Your Fonepay payment was not successful.',
              variant: 'destructive',
            });
            navigate(`/payment-failure?gateway=fonepay&txn=${params.PRN}`);
          }
        } else {
          throw new Error('Failed to process payment callback');
        }
      } catch (error) {
        console.error('Error processing Fonepay callback:', error);
        toast({
          title: 'Error',
          description: 'An error occurred while processing your payment.',
          variant: 'destructive',
        });
        navigate('/payment-failure');
      }
    };

    handleFonepayCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Processing Payment...</h2>
        <p className="text-gray-600">Please wait while we verify your Fonepay payment.</p>
      </div>
    </div>
  );
};
```

---

## Testing Guide

### Step 1: Test Environment Setup

```sql
-- Ensure test mode is enabled
UPDATE payment_gateways 
SET test_mode = true 
WHERE code = 'fonepay';
```

### Step 2: Test Credentials

```javascript
// Test configuration
const FONEPAY_TEST_CONFIG = {
  merchant_code: '2222050014849742',
  pan_number: '603854741',
  secret_key: 'dd3f7d1be3ad401a84b374aca469aa48',
  test_url: 'https://dev-clientapi.fonepay.com/api/merchantRequest',
  environment: 'test'
};
```

### Step 3: Test Payment Flow

1. **Create Test Order**
   - Go to checkout page
   - Select Fonepay as payment method
   - Enter test amount (e.g., NPR 100)

2. **Verify Payment Request**
   - Check console for hash generation
   - Verify all parameters are correct
   - Confirm redirect to Fonepay test server

3. **Test Payment Process**
   - Use Fonepay test environment
   - Scan QR code with test mobile app
   - Complete payment process

4. **Verify Response Handling**
   - Check webhook receives correct parameters
   - Verify hash validation works
   - Confirm order status updates

### Step 4: Debug Tools

```typescript
// Debug hash generation
const debugFonepayHash = (params: any, secretKey: string) => {
  const hashString = [
    params.PID, params.MD, params.PRN, params.AMT, params.CRN,
    params.DT, params.R1, params.R2, params.RU
  ].join(',');
  
  console.log('🔍 Hash String:', hashString);
  console.log('🔍 Secret Key:', secretKey);
  
  // Generate hash and compare
  // ... hash generation logic
};
```

---

## Production Deployment

### Step 1: Update Production Configuration

```sql
-- Update for production
UPDATE payment_gateways 
SET config = jsonb_set(config, '{environment}', '"production"'),
    test_mode = false
WHERE code = 'fonepay';
```

### Step 2: Production URLs

```typescript
const fonepayConfig = {
  payment_url: testMode 
    ? 'https://dev-clientapi.fonepay.com/api/merchantRequest'
    : 'https://clientapi.fonepay.com/api/merchantRequest',
  success_url: 'https://whyteclub.com/payment-success',
  failure_url: 'https://whyteclub.com/payment-failure',
  webhook_url: 'https://whyteclub.com/api/fonepay-webhook'
};
```

### Step 3: Deploy Edge Functions

```bash
# Deploy Fonepay webhook function
npx supabase functions deploy fonepay-webhook

# Deploy updated create-payment function
npx supabase functions deploy create-payment
```

---

## Security Considerations

### 1. **Secret Key Management**
- Never expose secret key in frontend code
- Store in environment variables
- Use different keys for test/production

### 2. **Hash Verification**
- Always verify HMAC-SHA512 hash on responses
- Use constant-time comparison for hash validation
- Log hash mismatches for security monitoring

### 3. **Parameter Validation**
- Validate all incoming parameters
- Check amount ranges and formats
- Sanitize user inputs before processing

### 4. **Transaction Security**
- Implement duplicate transaction prevention
- Add rate limiting for payment requests
- Monitor for suspicious activity patterns

---

## Troubleshooting Guide

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Hash Mismatch | Incorrect secret key or string format | Verify secret key and concatenation order |
| Payment Timeout | Network issues or server down | Implement retry logic and timeouts |
| Invalid Parameters | Missing or malformed data | Validate all parameters before sending |
| Webhook Failures | Incorrect URL or server errors | Check webhook endpoint and logs |

### Debug Checklist

1. **Configuration**
   - [ ] Merchant code is correct
   - [ ] Secret key matches Fonepay account
   - [ ] Test/production mode is correct

2. **Hash Generation**
   - [ ] Parameters are in correct order
   - [ ] No URL encoding in hash string
   - [ ] HMAC-SHA512 algorithm used

3. **Payment Flow**
   - [ ] Redirect URL is accessible
   - [ ] Webhook endpoint is working
   - [ ] Response parsing is correct

---

## Next Steps

1. **Phase 1** (Week 1): Database setup and basic configuration
2. **Phase 2** (Week 2): Backend Edge Functions implementation
3. **Phase 3** (Week 3): Frontend integration and testing
4. **Phase 4** (Week 4): Production deployment and monitoring

This comprehensive plan provides everything needed to successfully integrate Fonepay QR payments into your iwishBag platform. Follow each phase sequentially for the best results.

---

**Last Updated**: July 16, 2025  
**Author**: Claude AI Assistant  
**Version**: 1.0