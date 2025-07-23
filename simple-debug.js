// SIMPLE DEBUGGING SCRIPT - Run as one block in browser console
// Copy and paste this ENTIRE script at once

(function() {
  console.log('🔍 SIMPLE DEBUG: Checking Quote Data Access');
  console.log('============================================');

  // Step 1: Check how quote data is accessible
  console.log('🔍 Checking quote data access methods:');
  
  const methods = [
    { name: 'window.liveQuote', value: typeof window.liveQuote !== 'undefined' ? window.liveQuote : 'NOT FOUND' },
    { name: 'window.quote', value: typeof window.quote !== 'undefined' ? window.quote : 'NOT FOUND' },
    { name: 'window.__QUOTE_DATA__', value: typeof window.__QUOTE_DATA__ !== 'undefined' ? window.__QUOTE_DATA__ : 'NOT FOUND' },
    { name: 'React DevTools', value: 'Check React components' }
  ];
  
  methods.forEach(method => {
    console.log(`- ${method.name}:`, method.value === 'NOT FOUND' ? '❌ Not Available' : '✅ Available');
  });

  // Step 2: Try to find quote data in React components
  console.log('\n🔍 Searching for quote data in React components...');
  
  // Check if we can access React Fiber
  let foundQuote = null;
  
  try {
    // Look for React components with quote data
    const rootElement = document.querySelector('#root') || document.querySelector('[data-reactroot]') || document.body;
    
    if (rootElement && rootElement._reactInternalFiber) {
      console.log('✅ React Fiber found - searching for quote data...');
    } else if (rootElement && rootElement._reactInternals) {
      console.log('✅ React Internals found - searching for quote data...');
    } else {
      console.log('❌ React root not found');
    }
    
    // Try to find quote in URL params
    const urlParams = new URLSearchParams(window.location.search);
    const quoteIdFromUrl = window.location.pathname.split('/').pop();
    console.log('📍 Quote ID from URL:', quoteIdFromUrl);
    
    if (quoteIdFromUrl === 'ed0d8962-1834-49e0-bff2-59bcc3c71937') {
      console.log('✅ Correct quote ID found in URL');
    }
    
  } catch (e) {
    console.log('❌ Error accessing React data:', e.message);
  }

  // Step 3: Manual database query simulation
  console.log('\n🗄️ Expected Database Data:');
  console.log('==========================');
  
  const expectedQuoteData = {
    id: 'ed0d8962-1834-49e0-bff2-59bcc3c71937',
    origin_country: 'IN',
    destination_country: 'NP',
    costprice_total_usd: 1.0, // From our database check
    operational_data: {
      shipping: {
        selected_option: 'option_1753281135320',
        route_based_calculation: true
      }
    },
    customer_data: {
      info: {},
      preferences: {
        insurance_opted_in: true
      },
      shipping_address: {
        line1: '', city: '', state: '', postal: '', country: '', locked: false
      }
    }
  };
  
  console.log('Expected Quote Structure:', JSON.stringify(expectedQuoteData, null, 2));

  // Step 4: Manual calculation test
  console.log('\n🧮 MANUAL CALCULATION TEST:');
  console.log('===========================');
  
  const itemsValue = 1.0; // From database: costprice_total_usd = 1.0
  const handlingConfig = {
    base_fee: 5,
    percentage_of_value: 2,
    min_fee: 3,
    max_fee: 50
  };
  
  const insuranceConfig = {
    available: true,
    default_enabled: false,
    coverage_percentage: 1.5,
    min_fee: 2,
    max_coverage: 5000
  };
  
  // Calculate handling
  const percentageAmount = (itemsValue * handlingConfig.percentage_of_value) / 100;
  const calculatedAmount = handlingConfig.base_fee + percentageAmount;
  const handlingResult = Math.max(handlingConfig.min_fee, Math.min(calculatedAmount, handlingConfig.max_fee));
  
  console.log('📦 Handling Calculation:');
  console.log(`- Items Value: $${itemsValue}`);
  console.log(`- Formula: $${handlingConfig.base_fee} + ($${itemsValue} × ${handlingConfig.percentage_of_value}%) = $${calculatedAmount}`);
  console.log(`- Final: max($${handlingConfig.min_fee}, min($${calculatedAmount}, $${handlingConfig.max_fee})) = $${handlingResult}`);
  
  // Calculate insurance (if opted in)
  const insurancePercentage = (itemsValue * insuranceConfig.coverage_percentage) / 100;
  const insuranceConstrained = Math.min(insurancePercentage, insuranceConfig.max_coverage);
  const insuranceResult = Math.max(insuranceConstrained, insuranceConfig.min_fee);
  
  console.log('\n🛡️ Insurance Calculation (if opted in):');
  console.log(`- Items Value: $${itemsValue}`);
  console.log(`- Formula: $${itemsValue} × ${insuranceConfig.coverage_percentage}% = $${insurancePercentage}`);
  console.log(`- Final: max($${insuranceConstrained}, $${insuranceConfig.min_fee}) = $${insuranceResult}`);

  // Step 5: Expected vs Reality
  console.log('\n📊 EXPECTED RESULTS vs CURRENT:');
  console.log('===============================');
  console.log(`Expected Handling: $${handlingResult}`);
  console.log(`Expected Insurance: $${insuranceResult} (if opted in)`);
  console.log('Current Handling: Check the quote display');
  console.log('Current Insurance: Check the quote display');

  // Step 6: Next steps
  console.log('\n🎯 NEXT DEBUGGING STEPS:');
  console.log('========================');
  console.log('1. 🔄 TRIGGER RECALCULATION in the admin interface');
  console.log('2. 👀 Watch for these console logs:');
  console.log('   - "🚀 [DEBUG] calculateAllShippingOptions"');
  console.log('   - "[CalculationDefaults] calculateHandlingDefault called"');
  console.log('   - "hasHandlingConfig: true" (should NOT be false)');
  console.log('3. 📋 Copy ALL console output during recalculation');
  console.log('4. 🔍 Look for any "hasHandlingConfig: false" messages');
  
  console.log('\n💡 KEY INSIGHT:');
  console.log('===============');
  console.log('The items value is only $1.00, so:');
  console.log(`- Handling should be: $5 + ($1 × 2%) = $5.02`);
  console.log(`- Insurance should be: $1 × 1.5% = max($0.015, $2) = $2.00`);
  console.log('');
  console.log('🚀 Now trigger recalculation and watch the console!');
  
  return 'Debug script completed - proceed with recalculation';
})();