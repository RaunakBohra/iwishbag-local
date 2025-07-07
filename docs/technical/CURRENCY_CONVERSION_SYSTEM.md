# Currency Conversion System Documentation

## Overview

This document describes the multi-currency quote system that handles currency conversion for both admin and customer views in the quote calculator. The system supports dual-currency display for admins and customer-preferred single currency display.

## Problem Statement

The original system had several issues:
1. **Incorrect Customer Currency Display**: Customers saw origin currency instead of their preferred currency
2. **Missing Exchange Rate Fallbacks**: Only direct shipping route rates were used
3. **Inconsistent Conversion Logic**: Different components used different conversion methods
4. **Admin vs Customer View Confusion**: Both views used the same conversion logic

## Solution Architecture

### 1. Exchange Rate Fallback Chain

The system uses a three-tier fallback approach for exchange rates:

```
1. Shipping Route (Direct) → 2. Country Settings (USD-based) → 3. 1:1 Fallback
```

#### Implementation (`src/lib/currencyUtils.ts:116-204`)

```typescript
export async function getExchangeRate(
  fromCountry: string,
  toCountry: string
): Promise<ExchangeRateResult> {
  // 1. Try shipping route exchange rate (direct)
  const route = await supabase
    .from('shipping_routes')
    .select('exchange_rate')
    .eq('origin_country', fromCountry)
    .eq('destination_country', toCountry);

  // 2. Try country settings via USD conversion
  const rate = toRate / fromRate; // USD-based conversion

  // 3. Final fallback with warnings
  return { rate: 1, source: 'fallback', warning: '...' };
}
```

### 2. Dual Currency System

#### Admin View (Dual Currency)
- **Purpose**: Show both origin and destination currencies
- **Hook**: `useQuoteCalculation` with `isAdminView: true`
- **Display**: `$100/₨13,300` or `₹1500/₨2,404`

#### Customer View (Single Currency)
- **Purpose**: Show only customer's preferred currency
- **Hook**: `useQuoteDisplayCurrency`
- **Display**: `₨13,300` or `$18.07`

### 3. Key Components

#### Currency Utilities (`src/lib/currencyUtils.ts`)

**Core Functions:**
- `getExchangeRate()`: Implements fallback chain
- `formatCustomerCurrency()`: Single currency formatting
- `formatDualCurrencyNew()`: Dual currency formatting
- `getDestinationCountryFromQuote()`: Extract destination from quote

**Currency Conversion Examples:**
```typescript
// US→Nepal quote for JPY customer preference
const rate = await getExchangeRate('US', 'JP'); // 150.0 (via USD)
const display = formatCustomerCurrency(100, 'US', 'JPY', 150.0); // "¥15,000"

// India→Nepal quote for USD customer preference  
const rate = await getExchangeRate('IN', 'US'); // 0.012 (1/83)
const display = formatCustomerCurrency(1500, 'IN', 'USD', 0.012); // "$18.07"
```

#### Customer Currency Hook (`src/hooks/useQuoteDisplayCurrency.ts`)

```typescript
export function useQuoteDisplayCurrency({ quote, exchangeRate }) {
  const [customerExchangeRate, setCustomerExchangeRate] = useState(1);
  
  useEffect(() => {
    // Fetch origin → customer currency rate
    const rateResult = await getExchangeRate(originCountry, customerCountryCode);
    setCustomerExchangeRate(rateResult.rate);
  }, [quote, originCountry, customerPreferredCurrency]);
  
  const formatAmount = (amount) => {
    return formatCustomerCurrency(
      amount,
      originCountry,
      customerPreferredCurrency,
      customerExchangeRate // Use customer-specific rate
    );
  };
}
```

## Database Schema

### Required Tables

#### `shipping_routes`
```sql
CREATE TABLE shipping_routes (
  id UUID PRIMARY KEY,
  origin_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  exchange_rate DECIMAL(10,4), -- Direct conversion rate
  is_active BOOLEAN DEFAULT true
);
```

#### `country_settings`
```sql
CREATE TABLE country_settings (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- ISO country code (US, IN, NP)
  currency TEXT NOT NULL,    -- Currency code (USD, INR, NPR)
  rate_from_usd DECIMAL(10,4) NOT NULL -- Rate to convert FROM USD
);
```

#### Sample Data
```sql
INSERT INTO country_settings (code, currency, rate_from_usd) VALUES
  ('US', 'USD', 1.0),
  ('IN', 'INR', 83.0),
  ('NP', 'NPR', 133.0),
  ('CA', 'CAD', 1.36),
  ('JP', 'JPY', 150.0);
```

## Usage Examples

### Customer-Facing Components

```typescript
// Quote detail page
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';

function QuoteDetail({ quote }) {
  const { formatAmount } = useQuoteDisplayCurrency({ quote });
  
  return (
    <div>
      <p>Total: {formatAmount(quote.final_total)}</p>
      <p>Shipping: {formatAmount(quote.shipping_cost)}</p>
    </div>
  );
}
```

### Admin Components

```typescript
// Admin quote creator
import { useQuoteCalculation } from '@/hooks/useQuoteCalculation';

function AdminQuoteCreator() {
  const { formatDualCurrency } = useQuoteCalculation({
    isAdminView: true // Enable dual currency
  });
  
  return (
    <div>
      <p>Total: {formatDualCurrency(quote.final_total)}</p>
    </div>
  );
}
```

## Testing

### Comprehensive Test Suite

Run the currency conversion test:
```bash
node test-all-currency-conversions.js
```

### Expected Results

| Origin | Amount | Customer Pref | Expected Display |
|--------|---------|---------------|------------------|
| US     | $100   | NPR          | ₨13,300         |
| US     | $100   | INR          | ₹8,300          |
| IN     | ₹1500  | USD          | $18.07          |
| CA     | C$200  | INR          | ₹12,206         |
| JP     | ¥10000 | USD          | $66.67          |

### Test Scenarios

1. **Same Currency**: Origin and customer preference match
2. **Direct Shipping Route**: Has exchange_rate in shipping_routes
3. **USD-based Conversion**: Uses country_settings fallback
4. **Missing Rates**: Shows warning and uses 1:1 fallback

## Common Issues & Troubleshooting

### Issue 1: Wrong Currency Display
**Symptoms**: Customer sees origin currency instead of preferred currency
**Cause**: Using admin hooks in customer components
**Fix**: Replace `useQuoteCalculation` with `useQuoteDisplayCurrency`

### Issue 2: Double Conversion
**Symptoms**: Inflated amounts (e.g., $100 showing as ₹8300 instead of ₹83)
**Cause**: Converting already-converted amounts
**Fix**: Ensure amounts are in origin currency before conversion

### Issue 3: Missing Exchange Rates
**Symptoms**: 1:1 conversion with warnings
**Cause**: Missing data in country_settings table
**Fix**: Add missing countries to country_settings

```sql
INSERT INTO country_settings (code, currency, rate_from_usd) 
VALUES ('XX', 'XXX', rate_value);
```

### Issue 4: React Hooks Rules Violation
**Symptoms**: "Rendered more hooks than during the previous render"
**Cause**: Conditional hook calls
**Fix**: Move hooks before any conditional returns

```typescript
// ❌ Wrong
function Component({ quote }) {
  if (!quote) return null;
  const { formatAmount } = useQuoteDisplayCurrency({ quote });
}

// ✅ Correct
function Component({ quote }) {
  const { formatAmount } = useQuoteDisplayCurrency({ quote });
  if (!quote) return null;
}
```

## Future Enhancements

1. **Live Exchange Rates**: Integrate with external APIs
2. **Rate Caching**: Cache exchange rates to reduce API calls
3. **Historical Rates**: Track rate changes over time
4. **Admin Rate Management**: UI for updating exchange rates
5. **Currency Preference Per Quote**: Allow different currencies per quote

## Code Locations

### Key Files
- `src/lib/currencyUtils.ts` - Core currency logic
- `src/hooks/useQuoteDisplayCurrency.ts` - Customer currency hook
- `src/hooks/useQuoteCalculation.ts` - Admin currency hook
- `test-all-currency-conversions.js` - Comprehensive test suite

### Updated Components
- `src/components/dashboard/QuoteBreakdownDetails.tsx`
- `src/components/dashboard/QuotesTable.tsx`
- `src/pages/dashboard/QuoteDetail.tsx`
- `src/pages/dashboard/Quotes.tsx`

## Database Migration

```sql
-- Add exchange rate column to shipping routes (if not exists)
ALTER TABLE shipping_routes 
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,4);

-- Ensure country_settings table exists
CREATE TABLE IF NOT EXISTS country_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL,
  rate_from_usd DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

**Last Updated**: July 2025  
**Version**: 1.0  
**Author**: Development Team  
**Status**: Production Ready