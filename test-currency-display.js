/**
 * Test script to verify currency display behavior
 */

// Mock the currency utilities to test the display logic
const currencyMap = {
  'US': 'USD', 'IN': 'INR', 'NP': 'NPR', 'CN': 'CNY', 'AU': 'AUD'
};

const currencySymbols = {
  'USD': '$', 'INR': '₹', 'NPR': '₨', 'CNY': '¥', 'AUD': 'A$'
};

function getCountryCurrency(countryCode) {
  return currencyMap[countryCode] || 'USD';
}

function getCurrencySymbol(currency) {
  return currencySymbols[currency] || currency;
}

function formatDualCurrency(amount, originCountry, destinationCountry, exchangeRate) {
  const originCurrency = getCountryCurrency(originCountry);
  const destinationCurrency = getCountryCurrency(destinationCountry);
  
  const originSymbol = getCurrencySymbol(originCurrency);
  const originFormatted = `${originSymbol}${amount.toLocaleString()}`;
  
  if (exchangeRate && exchangeRate !== 1) {
    const convertedAmount = Math.round(amount * exchangeRate);
    const destinationSymbol = getCurrencySymbol(destinationCurrency);
    const destinationFormatted = `${destinationSymbol}${convertedAmount.toLocaleString()}`;
    
    return {
      origin: originFormatted,
      destination: destinationFormatted,
      short: `${originFormatted}/${destinationFormatted}`
    };
  }

  return {
    origin: originFormatted,
    destination: originFormatted,
    short: originFormatted
  };
}

function formatCustomerCurrency(amount, originCountry, customerPreferredCurrency, exchangeRate) {
  const originCurrency = getCountryCurrency(originCountry);
  
  if (customerPreferredCurrency === originCurrency) {
    const symbol = getCurrencySymbol(originCurrency);
    return `${symbol}${amount.toLocaleString()}`;
  }
  
  if (exchangeRate) {
    const convertedAmount = Math.round(amount * exchangeRate);
    const symbol = getCurrencySymbol(customerPreferredCurrency);
    return `${symbol}${convertedAmount.toLocaleString()}`;
  }
  
  const symbol = getCurrencySymbol(originCurrency);
  return `${symbol}${amount.toLocaleString()}`;
}

// Test scenarios
console.log('🧪 Testing Currency Display Logic\n');

const testScenarios = [
  {
    name: 'India → Nepal (Admin View)',
    originCountry: 'IN',
    destinationCountry: 'NP',
    amount: 1500,
    exchangeRate: 1.6,
    isAdmin: true,
    customerPreferredCurrency: 'NPR'
  },
  {
    name: 'India → Nepal (Customer View - NPR Preference)',
    originCountry: 'IN',
    destinationCountry: 'NP',
    amount: 1500,
    exchangeRate: 1.6,
    isAdmin: false,
    customerPreferredCurrency: 'NPR'
  },
  {
    name: 'USA → India (Admin View)',
    originCountry: 'US',
    destinationCountry: 'IN',
    amount: 100,
    exchangeRate: 83,
    isAdmin: true,
    customerPreferredCurrency: 'INR'
  },
  {
    name: 'USA → India (Customer View - INR Preference)',
    originCountry: 'US',
    destinationCountry: 'IN',
    amount: 100,
    exchangeRate: 83,
    isAdmin: false,
    customerPreferredCurrency: 'INR'
  }
];

testScenarios.forEach(scenario => {
  console.log(`📊 ${scenario.name}`);
  console.log(`   Amount: ${scenario.amount} (origin currency)`);
  console.log(`   Exchange Rate: 1:${scenario.exchangeRate}`);
  
  if (scenario.isAdmin) {
    const dualDisplay = formatDualCurrency(
      scenario.amount, 
      scenario.originCountry, 
      scenario.destinationCountry, 
      scenario.exchangeRate
    );
    console.log(`   👨‍💼 Admin sees: ${dualDisplay.short}`);
    console.log(`   ✅ Expected: Shows both currencies`);
  } else {
    const customerDisplay = formatCustomerCurrency(
      scenario.amount,
      scenario.originCountry,
      scenario.customerPreferredCurrency,
      scenario.exchangeRate
    );
    console.log(`   👤 Customer sees: ${customerDisplay}`);
    console.log(`   ✅ Expected: Shows only preferred currency`);
  }
  console.log('');
});

console.log('🎯 Key Points:');
console.log('• Admin breakdown should show: ₹1500/₨2400');
console.log('• Customer breakdown should show: ₨2400 (if NPR preferred)');
console.log('• Customer breakdown should show: ₹1500 (if INR preferred)');
console.log('• The component needs to detect destination country properly');