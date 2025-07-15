# iwishBag Currency Handling System Guide

> **Last Updated:** December 2024  
> **Version:** 2.0 (Post Multi-Currency Implementation)

## 🎯 **Executive Summary**

This document outlines the complete currency handling system for iwishBag, covering multi-currency payments, refunds, and admin operations. The system is designed to prevent currency mismatches that can cause refund failures and financial discrepancies.

## 🏗️ **System Architecture**

### **Three-Layer Currency Model**

1. **Quote Currency** - The currency in which the quote is calculated (based on destination country)
2. **Payment Currency** - The actual currency used for payment (may differ from quote)  
3. **Settlement Currency** - The currency recorded in the database (varies by component)

### **Database-Driven Currency System**

All currency information is managed through the `country_settings` table with the `CurrencyService` as the central access point:

```typescript
// ✅ CORRECT: Use CurrencyService for all currency operations
const currencyInfo = await currencyService.getCurrency('USD');
const symbol = currencyService.getCurrencySymbol('USD');

// ❌ INCORRECT: Direct hardcoded currency mappings
const symbol = currency === 'USD' ? '$' : '€';
```

## 🔄 **Payment Flow & Currency Handling**

### **1. Quote Creation**
- **Currency Determined By**: Destination country from `country_settings` table
- **Storage**: `quotes.final_currency` field
- **Display**: Uses user's preferred display currency (admin) or quote currency (customer)

### **2. Payment Processing**
- **PayU/Stripe**: Payment currency typically matches quote currency
- **PayPal**: Payment currency may differ (customer's PayPal account currency)
- **Bank Transfer**: Usually matches quote currency
- **Storage**: `payment_transactions.currency` field

### **3. Payment Recording**
```sql
-- All amounts stored with their actual currencies
INSERT INTO payment_ledger (
  quote_id,
  amount,
  currency,           -- CRITICAL: Actual payment currency
  payment_method,
  reference_number
);
```

## 🛡️ **Currency Validation Rules**

### **Critical Validation Points**

#### **1. Manual Payment Recording**
- ✅ **Currency Selector**: Admin must explicitly select payment currency
- ⚠️ **Mismatch Warning**: Alert when payment currency ≠ quote currency
- 🔒 **Validation**: Warn about potential recording errors

#### **2. Refund Processing**
- 🎯 **Golden Rule**: Refunds MUST be processed in original payment currency
- ❌ **Block Mixed Currency**: Prevent refunding multiple currencies together
- 🔍 **Suspicious Amount Detection**: Flag amounts with same numbers but different currencies

#### **3. Payment Verification**
- 📋 **Amount Verification**: Check payment amount matches expected range
- 🔄 **Currency Consistency**: Ensure payment currency aligns with quote context
- 📊 **Multi-Currency Alerts**: Flag quotes with payments in multiple currencies

### **Suspicious Amount Detection Algorithm**

```typescript
const isSuspiciousAmount = (payment: any, quote: any) => {
  const paymentCurrency = payment.currency || quote.currency;
  const tolerance = 0.01;
  
  // Flag if payment amount equals quote amount but currencies differ
  if (Math.abs(payment.amount - quote.final_total) < tolerance && 
      paymentCurrency !== quote.currency) {
    return true; // e.g., ₹1642.95 recorded as $1642.95
  }
  
  return false;
};
```

## 🎨 **Admin Interface Guidelines**

### **Currency Display Standards**

#### **Payment Timeline**
```tsx
// ✅ Show actual payment currency with mismatch indicators
<span className="amount">
  {getCurrencySymbol(entry.currency)}{amount.toFixed(2)}
  {entry.currency !== quoteCurrency && (
    <Badge variant="outline" className="ml-1">
      {entry.currency}
    </Badge>
  )}
</span>
```

#### **Multi-Currency Breakdown**
```tsx
// ✅ Show currency breakdown when multiple currencies detected
{hasMultipleCurrencies && (
  <div className="currency-breakdown">
    <h4>Multi-Currency Payments</h4>
    {Object.entries(currencyBreakdown).map(([curr, amounts]) => (
      <div key={curr}>
        {curr}: {formatAmount(amounts.net, curr)}
      </div>
    ))}
  </div>
)}
```

### **Warning System**

| Warning Level | Trigger | Action |
|---------------|---------|--------|
| 🟡 **CAUTION** | Payment currency ≠ Quote currency | Show currency mismatch badge |
| 🟠 **WARNING** | Suspicious amount detected | Alert with verification prompt |
| 🔴 **ERROR** | Mixed currency refund attempt | Block operation with explanation |

## 🔧 **Technical Implementation**

### **Core Components Enhanced**

#### **1. UnifiedPaymentModal**
- ✅ Payment currency selector with validation
- ✅ Multi-currency payment breakdown
- ✅ Currency-specific amount display
- ✅ Refund currency validation

#### **2. RefundManagementModal** 
- ✅ Currency mismatch warnings
- ✅ Suspicious amount detection
- ✅ Mixed currency prevention
- ✅ Gateway-specific currency handling

#### **3. PaymentManagementWidget**
- ✅ Currency field display
- ✅ Multi-currency alerts
- ✅ Mismatch warnings for misaligned payments

### **Database Schema Considerations**

```sql
-- ✅ REQUIRED: All payment tables must include currency field
ALTER TABLE payment_ledger ADD COLUMN currency VARCHAR(3);
ALTER TABLE payment_transactions ADD COLUMN currency VARCHAR(3);
ALTER TABLE gateway_refunds ADD COLUMN currency VARCHAR(3);

-- ✅ CRITICAL: Remove currency constraints to allow dynamic currencies
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_preferred_display_currency;
```

## 🎛️ **Gateway-Specific Handling**

### **PayU Integration**
- **Currency**: Typically INR for India customers
- **Refunds**: Use original payment currency
- **Edge Function**: `payu-refund` handles currency recording

### **PayPal Integration**  
- **Currency**: Customer's PayPal account currency (may differ from quote)
- **Recording**: Store actual PayPal transaction currency
- **Edge Function**: `paypal-refund` validates currency matching

### **Stripe Integration**
- **Currency**: Usually matches quote currency
- **Multi-Currency**: Support for international payments
- **Validation**: Ensure currency compatibility with destination country

## ⚠️ **Common Pitfalls & Solutions**

### **❌ Problem 1: Currency Mismatch Refund Failures**
```typescript
// WRONG: Refunding in quote currency when payment was in different currency
await processRefund(quoteAmount, quoteCurrency); // ❌

// CORRECT: Refund in original payment currency
await processRefund(paymentAmount, paymentCurrency); // ✅
```

### **❌ Problem 2: Hardcoded Currency Logic**
```typescript
// WRONG: Hardcoded currency mappings
const symbol = country === 'IN' ? '₹' : '$'; // ❌

// CORRECT: Use CurrencyService
const symbol = currencyService.getCurrencySymbol(currency); // ✅
```

### **❌ Problem 3: Missing Currency Context**
```typescript
// WRONG: Amount without currency context
<span>{amount.toFixed(2)}</span> // ❌

// CORRECT: Always show currency with amounts
<span>{formatAmountForDisplay(amount, currency)}</span> // ✅
```

## 🔄 **Migration & Maintenance**

### **Data Migration Checklist**
- [ ] Update existing payment records with currency fields
- [ ] Migrate old refund records to include currency information
- [ ] Validate historical data for currency consistency
- [ ] Update report queries to handle multi-currency data

### **Monitoring & Alerts**
- 📊 **Currency Mismatch Rate**: Track % of payments with currency mismatches
- 🚨 **Failed Refund Alerts**: Monitor refunds failing due to currency issues  
- 📈 **Multi-Currency Usage**: Analytics on currency distribution

## 🎯 **Best Practices Summary**

### **DO ✅**
- Always store actual payment currency in database
- Use CurrencyService for all currency operations
- Show clear currency indicators in admin interfaces
- Validate currency consistency before processing refunds
- Alert administrators to potential currency recording errors
- Process refunds in original payment currency

### **DON'T ❌**
- Hardcode currency mappings or symbols
- Assume payment currency matches quote currency  
- Process refunds without currency validation
- Skip currency fields in payment records
- Ignore currency mismatch warnings
- Mix different currencies in single refund operations

## 📞 **Support & Troubleshooting**

### **Currency Mismatch Resolution**
1. **Identify**: Check payment records for currency field accuracy
2. **Verify**: Confirm actual payment currency with gateway
3. **Update**: Correct currency information in database if needed
4. **Process**: Use corrected currency for refund operations

### **Multi-Currency Quote Handling**
1. **Review**: Check all payments for currency consistency
2. **Validate**: Ensure each payment amount makes sense in its currency
3. **Alert**: Notify finance team of mixed currency situations
4. **Document**: Record any manual currency adjustments

---

## 📋 **Implementation Status**

| Component | Status | Currency Features |
|-----------|--------|-------------------|
| 🟢 **UnifiedPaymentModal** | ✅ Complete | Currency validation, multi-currency breakdown, payment recording |
| 🟢 **RefundManagementModal** | ✅ Complete | Currency mismatch detection, refund validation, suspicious amount alerts |
| 🟢 **PaymentManagementWidget** | ✅ Complete | Currency display, mismatch warnings, multi-currency detection |
| 🟢 **PayPal Refund Function** | ✅ Complete | Currency-aware refund processing, proper recording |
| 🟢 **PayU Refund Function** | ✅ Complete | Currency validation, gateway integration |
| 🟢 **Manual Payment Recording** | ✅ Complete | Currency selection, validation warnings |

**System Status: Production Ready** ✅

The iwishBag currency handling system is now robust, secure, and capable of handling complex multi-currency scenarios while preventing the financial discrepancies that previously caused refund failures.