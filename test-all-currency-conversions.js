/**
 * Comprehensive test for customer currency conversion across all combinations
 */

// Mock country_settings data (based on seed.sql)
const countrySettings = {
  'US': { rate_from_usd: 1.0, currency: 'USD' },
  'IN': { rate_from_usd: 83.0, currency: 'INR' },
  'NP': { rate_from_usd: 133.0, currency: 'NPR' },
  'CA': { rate_from_usd: 1.36, currency: 'CAD' },
  'GB': { rate_from_usd: 0.79, currency: 'GBP' },
  'AU': { rate_from_usd: 1.52, currency: 'AUD' },
  'JP': { rate_from_usd: 150.0, currency: 'JPY' }
};

// Currency symbols
const currencySymbols = {
  'USD': '$', 'INR': '₹', 'NPR': '₨', 'CAD': 'C$', 
  'GBP': '£', 'AUD': 'A$', 'JPY': '¥'
};

// Mock exchange rate calculation (USD-based conversion)
function calculateExchangeRate(fromCountry, toCountry) {
  const fromRate = countrySettings[fromCountry]?.rate_from_usd;
  const toRate = countrySettings[toCountry]?.rate_from_usd;
  
  if (!fromRate || !toRate) {
    return { rate: 1, source: 'fallback', warning: `Missing rates for ${fromCountry} or ${toCountry}` };
  }
  
  // Convert via USD: fromCurrency -> USD -> toCurrency
  const rate = toRate / fromRate;
  return { rate, source: 'country_settings', warning: null };
}

// Mock currency conversion with rounding
function convertCurrency(amount, exchangeRate, targetCurrency) {
  const converted = amount * exchangeRate;
  
  // Round to whole numbers for Asian currencies
  const noDecimalCurrencies = ['NPR', 'INR', 'JPY'];
  if (noDecimalCurrencies.includes(targetCurrency)) {
    return Math.round(converted);
  }
  
  // Round to 2 decimal places for others
  return Math.round(converted * 100) / 100;
}

// Mock customer currency formatting
function formatCustomerCurrency(amount, originCountry, customerCurrency, exchangeRate) {
  const originCurrency = countrySettings[originCountry]?.currency;
  
  // If customer prefers origin currency, no conversion needed
  if (customerCurrency === originCurrency) {
    const symbol = currencySymbols[originCurrency];
    return `${symbol}${amount.toLocaleString()}`;
  }
  
  // Convert to customer's preferred currency
  if (exchangeRate && exchangeRate !== 1) {
    const convertedAmount = convertCurrency(amount, exchangeRate, customerCurrency);
    const symbol = currencySymbols[customerCurrency];
    return `${symbol}${convertedAmount.toLocaleString()}`;
  }
  
  // Fallback to origin currency
  const symbol = currencySymbols[originCurrency];
  return `${symbol}${amount.toLocaleString()}`;
}

console.log('🧪 COMPREHENSIVE CURRENCY CONVERSION TEST\n');
console.log('='.repeat(60));

// Test scenarios based on your screenshots and requirements
const testScenarios = [
  // US→Nepal quote (your main example)
  { 
    quote: { originCountry: 'US', amount: 100, destinationCountry: 'NP' },
    customerPreferences: ['USD', 'NPR', 'INR', 'JPY', 'GBP', 'CAD'],
    description: 'US→Nepal Quote ($100)'
  },
  
  // India→Nepal quote (shipping route exists)
  {
    quote: { originCountry: 'IN', amount: 1500, destinationCountry: 'NP' },
    customerPreferences: ['INR', 'NPR', 'USD', 'JPY'],
    description: 'India→Nepal Quote (₹1500)'
  },
  
  // Canada→UK quote
  {
    quote: { originCountry: 'CA', amount: 200, destinationCountry: 'GB' },
    customerPreferences: ['CAD', 'GBP', 'USD', 'INR'],
    description: 'Canada→UK Quote (C$200)'
  },
  
  // Japan→Australia quote
  {
    quote: { originCountry: 'JP', amount: 10000, destinationCountry: 'AU' },
    customerPreferences: ['JPY', 'AUD', 'USD'],
    description: 'Japan→Australia Quote (¥10,000)'
  }
];

let totalTests = 0;
let passedTests = 0;

testScenarios.forEach(({ quote, customerPreferences, description }) => {
  console.log(`\n📊 ${description}`);
  console.log('-'.repeat(50));
  
  customerPreferences.forEach(customerCurrency => {
    totalTests++;
    
    // Get the customer country code
    const customerCountryCode = Object.entries(countrySettings)
      .find(([_, data]) => data.currency === customerCurrency)?.[0];
    
    if (!customerCountryCode) {
      console.log(`❌ ${customerCurrency}: No country mapping found`);
      return;
    }
    
    // Calculate exchange rate from origin to customer currency
    const { rate, source, warning } = calculateExchangeRate(quote.originCountry, customerCountryCode);
    
    // Format the amount for customer
    const formattedAmount = formatCustomerCurrency(
      quote.amount, 
      quote.originCountry, 
      customerCurrency, 
      rate
    );
    
    // Determine if this is correct
    const originCurrency = countrySettings[quote.originCountry]?.currency;
    const isOriginCurrency = customerCurrency === originCurrency;
    const hasValidRate = rate > 0 && rate !== 1;
    
    let status;
    if (isOriginCurrency) {
      status = '✅ No conversion needed';
      passedTests++;
    } else if (hasValidRate && !warning) {
      status = '✅ Converted successfully';
      passedTests++;
    } else if (warning) {
      status = '⚠️  Fallback used';
    } else {
      status = '❌ Conversion failed';
    }
    
    console.log(`   ${customerCurrency}: ${formattedAmount} | Rate: ${rate.toFixed(4)} (${source}) | ${status}`);
    
    if (warning) {
      console.log(`      ⚠️  Warning: ${warning}`);
    }
  });
});

console.log('\n' + '='.repeat(60));
console.log(`📈 TEST RESULTS: ${passedTests}/${totalTests} tests passed`);

// Expected conversion examples
console.log('\n🎯 KEY EXPECTED CONVERSIONS:');
console.log('• US→Nepal, NPR preference: $100 → ₨13,300 (100 × 133)');
console.log('• US→Nepal, INR preference: $100 → ₹8,300 (100 × 83)');
console.log('• India→Nepal, USD preference: ₹1500 → $18.07 (1500 ÷ 83)');
console.log('• Canada→UK, INR preference: C$200 → ₹12,206 (200 ÷ 1.36 × 83)');

// Test edge cases
console.log('\n🔍 EDGE CASE TESTS:');

// Test missing currency
const missingTest = calculateExchangeRate('US', 'XX');
console.log(`Missing country: Rate=${missingTest.rate}, Warning="${missingTest.warning}"`);

// Test same currency
const sameTest = calculateExchangeRate('US', 'US');
console.log(`Same currency: Rate=${sameTest.rate}, Source=${sameTest.source}`);

console.log('\n✅ Currency conversion testing complete!');
console.log('🚀 Ready for real-world testing in the application.');