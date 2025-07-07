# Currency Conversion Policy for Shipping and Quotes

## Overview
- All shipping rates (base cost, per kg, etc.) are stored and calculated in the purchase (origin) country's currency.
- No currency conversion is needed for shipping costs at quote calculation time.
- All quote calculations (product, shipping, taxes, etc.) are performed in the purchase country's currency.
- Display and payment conversions (e.g., to USD, NPR) use the central rates table or country settings at display/payment time.

## UI Labeling Best Practices
- Clearly label all shipping cost fields with the correct currency symbol based on the origin country.
- Use dynamic currency symbols (₹ for India, $ for US, NPR for Nepal, etc.) instead of hardcoded "$".
- Include helpful text explaining that all costs must be in the purchase (origin) country's currency.
- Display costs in the correct currency in shipping route lists and summaries.

## Implementation Details

### 1. Dynamic Currency Labels in Admin UI
- **File:** `src/components/admin/ShippingRouteManager.tsx`
- **Changes Made:**
  - Added `getCurrencySymbol()` helper function to map country codes to currency symbols
  - Updated all shipping cost labels to use dynamic currency symbols
  - Added explanatory text about currency requirements
  - Updated route display cards to show correct currency symbols

### 2. Currency Symbols Mapping
```javascript
const currencyMap = {
  'US': '$',
  'IN': '₹', 
  'NP': 'NPR',
  'CN': '¥',
  'GB': '£',
  'EU': '€',
  'CA': 'C$',
  'AU': 'A$'
};
```

### 3. Audit Script
- **File:** `audit-shipping-routes-currency.js`
- **Purpose:** Check existing shipping routes for potential currency inconsistencies
- **Features:**
  - Validates cost ranges against expected currency values
  - Flags routes with potentially incorrect currency values
  - Provides recommendations for fixing issues
  - Generates summary report

## Usage Guidelines

### For Admins
1. **When creating shipping routes:**
   - Select the origin country first
   - All cost fields will automatically show the correct currency symbol
   - Enter costs in the origin country's currency
   - Review the explanatory text to confirm understanding

2. **When reviewing existing routes:**
   - Run the audit script to check for currency inconsistencies
   - Update any routes with incorrect currency values
   - Verify that displayed costs match the expected currency

### For Developers
1. **Adding new countries:**
   - Update the `currencyMap` in `ShippingRouteManager.tsx`
   - Add expected cost ranges to the audit script
   - Test with sample data

2. **Currency validation:**
   - Consider adding client-side validation for cost ranges
   - Implement server-side validation for currency consistency
   - Add currency conversion warnings when needed

## Best Practices

### 1. Currency Consistency
- Always store shipping costs in the origin country's currency
- Never mix currencies within a single shipping route
- Use consistent decimal precision (2 decimal places recommended)

### 2. User Experience
- Make currency requirements clear in the UI
- Provide helpful tooltips and explanations
- Show currency symbols consistently throughout the interface

### 3. Data Validation
- Validate cost ranges against expected currency values
- Flag potentially incorrect currency entries
- Provide clear error messages for currency-related issues

## Future Enhancements

### 1. Exchange Rate Integration
- Add exchange rate fields to shipping routes for future flexibility
- Implement automatic currency conversion for display purposes
- Support for multiple payment currencies

### 2. Advanced Validation
- Real-time currency validation in forms
- Automatic currency detection based on cost ranges
- Integration with external currency APIs

### 3. Reporting
- Currency-specific shipping cost reports
- Cross-currency cost comparisons
- Historical currency trend analysis

## Troubleshooting

### Common Issues
1. **Wrong currency symbols displayed:**
   - Check that the country code is correctly mapped in `currencyMap`
   - Verify that the origin country is properly selected

2. **Costs seem incorrect:**
   - Run the audit script to check for currency inconsistencies
   - Verify that costs are entered in the origin country's currency
   - Check expected cost ranges for the currency

3. **Currency conversion issues:**
   - Ensure all calculations use the same base currency
   - Verify exchange rates are up-to-date
   - Check for rounding errors in calculations

### Debug Steps
1. Run the audit script: `node audit-shipping-routes-currency.js`
2. Check the browser console for currency-related errors
3. Verify database values match expected currency ranges
4. Test with known good data to isolate issues

## Example Calculation Flow
1. Product price: ₹1,000 INR (purchase currency)
2. Shipping cost: ₹500 INR (purchase currency)
3. Subtotal: ₹1,500 INR
4. If user wants to see or pay in USD, convert at display/payment time using the latest USD→INR rate from the central rates table.

## Edge Cases
- If shipping costs are ever provided in a different currency (e.g., carrier charges in NPR for India→Nepal), add an exchange rate field to the route and convert to the purchase currency at calculation time.
- For now, keep all costs in the purchase currency for simplicity and consistency.

## Maintenance
- Ensure all admin UI and documentation is kept up to date with this policy.
- Review and update as business needs evolve. 