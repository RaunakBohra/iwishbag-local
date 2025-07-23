// Force the quote to use async calculation path with proper shipping options
// Run this in browser console on the quote page

console.log('🔧 FORCING ASYNC CALCULATION PATH');
console.log('=================================');

if (typeof window.liveQuote === 'undefined') {
  console.error('❌ No liveQuote found');
  return;
}

const quote = window.liveQuote;

console.log('📋 Target Quote:', quote.id);
console.log('📍 Route:', quote.origin_country, '→', quote.destination_country);

// Step 1: Ensure operational_data structure exists
if (!quote.operational_data) quote.operational_data = {};
if (!quote.operational_data.shipping) quote.operational_data.shipping = {};
if (!quote.customer_data) quote.customer_data = {};
if (!quote.customer_data.preferences) quote.customer_data.preferences = {};

// Step 2: Set the correct shipping option ID
const correctOptionId = 'option_1753281135320';
quote.operational_data.shipping.selected_option = correctOptionId;
console.log('✅ Set shipping option:', correctOptionId);

// Step 3: Remove manual overrides that force sync path
if (quote.operational_data.hasOwnProperty('handling_charge')) {
  delete quote.operational_data.handling_charge;
  console.log('✅ Removed manual handling override');
}

if (quote.operational_data.hasOwnProperty('insurance_amount')) {
  delete quote.operational_data.insurance_amount;
  console.log('✅ Removed manual insurance override');
}

// Step 4: Enable insurance opt-in
quote.customer_data.preferences.insurance_opted_in = true;
console.log('✅ Enabled insurance opt-in');

// Step 5: Force route-based calculation flag
quote.operational_data.shipping.route_based_calculation = true;
console.log('✅ Enabled route-based calculation');

// Step 6: Clear any cached breakdown to force recalculation
if (quote.calculation_data && quote.calculation_data.breakdown) {
  // Don't delete the whole breakdown, but mark it for refresh
  quote.calculation_data.breakdown._needs_recalc = true;
}

console.log('\n🎯 EXPECTED RESULTS AFTER RECALCULATION:');
console.log('- Handling: $5 + ($' + (quote.costprice_total_usd || 1000) + ' × 2%) = $' + (5 + ((quote.costprice_total_usd || 1000) * 0.02)));
console.log('- Insurance: $' + (quote.costprice_total_usd || 1000) + ' × 1.5% = $' + ((quote.costprice_total_usd || 1000) * 0.015));

console.log('\n🔍 WATCH FOR THESE CONSOLE LOGS:');
console.log('1. "🎯 [DEBUG] calculateRouteBasedHandling called"');
console.log('2. "[CalculationDefaults] calculateHandlingDefault called"');
console.log('3. "hasHandlingConfig: true" (NOT false)');
console.log('4. "📦 [DEBUG] Auto-applying route-based handling charge"');

console.log('\n🚀 NOW TRIGGER RECALCULATION!');
console.log('(Edit the quote, change a value, or click recalculate button)');

// Step 7: Show current state
console.log('\n📊 CURRENT STATE:');
console.log('- Selected Option:', quote.operational_data.shipping.selected_option);
console.log('- Route-based Calc:', quote.operational_data.shipping.route_based_calculation);
console.log('- Manual Handling:', quote.operational_data.handling_charge || 'REMOVED');
console.log('- Manual Insurance:', quote.operational_data.insurance_amount || 'REMOVED');
console.log('- Insurance Opt-in:', quote.customer_data.preferences.insurance_opted_in);

// Helpful reminder
console.log('\n💡 TIP: If it still shows $0, check that:');
console.log('1. The ShippingOption fix was applied (handling_charge field exists)');
console.log('2. The async calculation path is being used (not sync direct)');
console.log('3. No errors in console during recalculation');