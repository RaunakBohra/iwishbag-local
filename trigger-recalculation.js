// Solution 3: Browser console script to trigger recalculation
// Paste this in your browser console while on the quote page

console.log('🔄 Starting forced recalculation...');

// Step 1: Enable insurance opt-in
if (window.liveQuote) {
  window.liveQuote.customer_data = window.liveQuote.customer_data || {};
  window.liveQuote.customer_data.preferences = window.liveQuote.customer_data.preferences || {};
  window.liveQuote.customer_data.preferences.insurance_opted_in = true;
  console.log('✅ Insurance opt-in enabled');
}

// Step 2: Ensure correct shipping option is selected
if (window.liveQuote && window.liveQuote.operational_data) {
  window.liveQuote.operational_data.shipping = window.liveQuote.operational_data.shipping || {};
  window.liveQuote.operational_data.shipping.selected_option = 'option_1753281135320';
  console.log('✅ Correct shipping option selected');
}

// Step 3: Clear any manual overrides that might be forcing 0
if (window.liveQuote && window.liveQuote.operational_data) {
  delete window.liveQuote.operational_data.handling_charge;
  delete window.liveQuote.operational_data.insurance_amount;
  console.log('✅ Manual overrides cleared');
}

// Expected results after recalculation:
console.log('📊 Expected results:');
console.log('- Handling: $5 + ($1000 × 2%) = $25');
console.log('- Insurance: $1000 × 1.5% = $15');
console.log('');
console.log('🎯 Now trigger recalculation in your admin interface');
console.log('Look for a "Recalculate" or "Update Quote" button');