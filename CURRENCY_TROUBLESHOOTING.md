# Currency Display Troubleshooting Guide

## 🔍 Issue: Cost Breakdown Only Shows Origin Currency

### Quick Diagnosis

1. **Check the Debug Panel**: Look for the blue debug box at the top of the quote breakdown
   - Should show: `IN → NP | Rate: 1.6 (shipping_route) | Test amount ₹1000 = ₹1000/₨1600`
   - If shows `IN → US` or wrong destination, that's the issue

2. **Check Console Logs**: Open browser dev tools and look for:
   ```
   [QuoteBreakdownDetails] Debug info: {
     originCountry: "IN",
     destinationCountry: "NP",  // Should be correct
     exchangeRate: 1.6,         // Should be > 1
     exchangeRateSource: "shipping_route"  // Best case
   }
   ```

### Common Issues & Fixes

#### ❌ **Issue 1: Destination Country Not Detected**
```
Debug shows: IN → US (should be IN → NP)
```
**Fix**: Quote object missing destination_country field
- Check if `destination_country` is set in the quotes table
- May need to update quote creation to save destination_country

#### ❌ **Issue 2: Exchange Rate Missing**
```
Debug shows: Rate: 1 (fallback)
```
**Fix**: No exchange rate configured for this route
- Go to Admin → Shipping Routes → Exchange Rates tab
- Add/update the IN → NP exchange rate

#### ❌ **Issue 3: Wrong View Mode**
```
Shows single currency instead of dual currency
```
**Fix**: Change `isAdminView` setting in component

## 🛠️ Manual Testing Steps

### 1. Test Exchange Rate System
```bash
node test-currency-system.js
```
Should show:
```
✅ Shipping route rate: 1 INR = 1.6 NPR
💱 Converted amounts:
   Item: ₹1000 = ₨1600
   Admin display: ₹1500/₨2400
   Customer display: ₨2400
```

### 2. Check Database Records
```sql
-- Check if route exists with exchange rate
SELECT origin_country, destination_country, exchange_rate 
FROM shipping_routes 
WHERE origin_country = 'IN' AND destination_country = 'NP';

-- Check quote destination country
SELECT id, country_code, destination_country, shipping_address 
FROM quotes 
WHERE id = 'YOUR_QUOTE_ID';
```

### 3. Test Currency Display Manually
```bash
node test-currency-display.js
```

## 🎯 Expected Behavior

### For India → Nepal Quote:

**Admin View (QuoteCalculatedCosts.tsx):**
- Each line item: `₹500/₨800`
- Total: `₹1500/₨2400`
- Shows exchange rate source badge

**Customer View (QuoteBreakdownDetails.tsx):**
- If customer prefers NPR: Shows `₨2400`
- If customer prefers INR: Shows `₹1500`
- If no preference: Shows destination currency (NPR)

## 🔧 Quick Fixes

### Fix 1: Force Dual Currency Display
In QuoteBreakdownDetails.tsx:
```typescript
isAdminView: true // Always show dual currency
```

### Fix 2: Manual Destination Country
```typescript
const destinationCountry = 'NP'; // Force for testing
```

### Fix 3: Manual Exchange Rate
```typescript
const exchangeRate = 1.6; // Force for testing
```

## 📊 Database Schema Check

Ensure your quotes table has:
```sql
ALTER TABLE quotes ADD COLUMN destination_country TEXT;
UPDATE quotes SET destination_country = 'NP' WHERE country_code = 'IN';
```

## 🎯 File Locations

- **Main Currency Logic**: `src/lib/currencyUtils.ts`
- **Dual Display Component**: `src/components/admin/DualCurrencyDisplay.tsx`
- **Admin Quote Costs**: `src/components/admin/QuoteCalculatedCosts.tsx`
- **Customer Breakdown**: `src/components/dashboard/QuoteBreakdownDetails.tsx`
- **Currency Hooks**: `src/hooks/useCurrencyConversion.ts`

---

**Next Steps**: Start your dev server and check the debug panel at the top of any quote breakdown page!