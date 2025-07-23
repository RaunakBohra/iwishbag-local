// Force recalculation for the specific quote with proper shipping option selection
// Run this in the browser console on the quote page

const quoteId = 'ed0d8962-1834-49e0-bff2-59bcc3c71937';

console.log('🔄 Starting forced recalculation for quote:', quoteId);

// This should trigger the SmartCalculationEngine to recalculate with proper shipping options
// Check if you have a recalculate button or similar functionality in your admin interface

// Alternative: Check the current calculation state
console.log('Current quote data in browser:');
console.log(window.liveQuote || window.quote);

console.log('Expected calculations:');
console.log('- Handling: $5 base + 2% of $1000 = $25');
console.log('- Insurance: 1.5% of $1000 = $15 (if opted in)');

// If you have access to the calculation functions:
// Manually trigger calculation with proper shipping option
console.log('To fix:');
console.log('1. Ensure customer_data.preferences.insurance_opted_in = true');
console.log('2. Ensure shipping option "option_1753281135320" is selected');
console.log('3. Clear any manual overrides in operational_data');