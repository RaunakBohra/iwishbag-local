// Test Smart Currency Rounding in Development Environment
import { currencyService } from './src/services/CurrencyService';

console.log('🧪 Testing CurrencyService Smart Rounding Implementation');
console.log('=' .repeat(60));

// Test the specific amounts from your quote
const testCases = [
  { amount: 1103.69, currency: 'USD', description: 'Your quote USD amount' },
  { amount: 147012.11, currency: 'NPR', description: 'Your quote NPR amount' },
  { amount: 999.50, currency: 'INR', description: 'Small INR amount' },
  { amount: 5678, currency: 'NPR', description: 'Medium NPR amount' },
  { amount: 99.99, currency: 'USD', description: 'Small USD amount' },
  { amount: 147012, currency: 'JPY', description: 'Large JPY amount' },
  { amount: 2345, currency: 'GBP', description: 'Large GBP amount' },
];

console.log('\n📊 Test Results:');
console.log('-'.repeat(60));

testCases.forEach(({ amount, currency, description }) => {
  try {
    const formatted = currencyService.formatAmount(amount, currency);
    console.log(`${description}:`);
    console.log(`  ${amount} ${currency} → ${formatted}`);
    console.log('');
  } catch (error) {
    console.error(`❌ Error formatting ${amount} ${currency}:`, error);
  }
});

console.log('✅ Expected Smart Rounding Behavior:');
console.log('- $1,103.69 should become → $1,100 (rounded to nearest $10)');
console.log('- ₨147,012.11 should become → ₨147,000 (rounded to nearest ₨100)');
console.log('- ₹999.50 should stay → ₹999.50 (small amount, keep decimals)');
console.log('- ₨5,678 should become → ₨5,680 (rounded to nearest ₨10)');
console.log('- $99.99 should stay → $99.99 (small amount, keep decimals)');
console.log('- ¥147,012 should become → ¥147,010 (rounded to nearest ¥10)');
console.log('- £2,345 should become → £2,350 (rounded to nearest £10)');

export {}; // Make this a module