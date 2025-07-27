/**
 * Browser Test Runner for Detailed Tax Analysis
 * Run this in the browser console to test hardcoded values, HSN rates, and valuation methods
 */

(async function runDetailedAnalysis() {
  console.log('🔍 Starting Detailed Tax Analysis...\n');
  
  try {
    // Test 1: Check hardcoded values (known issues)
    console.log('📊 TEST 1: Hardcoded Values Analysis');
    console.log('=====================================');
    console.log('❌ FOUND: Hardcoded VAT rates in HSNTaxService:');
    console.log('   • Nepal: 13% (line 156)');
    console.log('   • India: 18% (line 159)');
    console.log('   • China: 13% (line 165)');
    console.log('');
    console.log('❌ FOUND: Hardcoded fallbacks in SmartCalculationEngine:');
    console.log('   • Manual rate fallback: 18% (line 1798)');
    console.log('   • Customs rate fallback: 10% (line 1804)');
    console.log('');

    // Test 2: HSN customs rates
    console.log('📊 TEST 2: HSN Customs Rate Testing');
    console.log('====================================');
    
    const { hsnTaxService } = await import('/src/services/HSNTaxService.ts');
    const testCodes = ['6204', '8517', '8414'];
    
    for (const code of testCodes) {
      try {
        const rates = await hsnTaxService.getHSNTaxRates(code, 'NP');
        if (rates) {
          console.log(`✅ HSN ${code}: Customs ${rates.customs}%, VAT ${rates.vat}%`);
          if (rates.customs === 0) {
            console.log(`   ⚠️  WARNING: 0% customs rate - check if this is correct`);
          }
        } else {
          console.log(`❌ HSN ${code}: No rates found`);
        }
      } catch (error) {
        console.log(`❌ HSN ${code}: Error - ${error.message}`);
      }
    }
    console.log('');

    // Test 3: Valuation methods
    console.log('📊 TEST 3: Valuation Method Testing');
    console.log('===================================');
    
    const { SmartCalculationEngine } = await import('/src/services/SmartCalculationEngine.ts');
    const engine = SmartCalculationEngine.getInstance();
    
    const testQuote = {
      id: 'valuation-test',
      origin_country: 'IN',
      destination_country: 'NP',
      customer_data: { name: 'Test', email: 'test@test.com' },
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      calculation_data: { items_total: 1000, total_weight: 2 },
      operational_data: { customs: { percentage: 20 }, domestic_shipping: 50 },
      items: [{
        id: 'test-item',
        name: 'Test Product',
        quantity: 1,
        costprice_origin: 1000, // $1000 base
        weight: 2,
        hsn_code: '6204'
      }]
    };

    const valuationMethods = ['product_value', 'minimum_valuation', 'higher_of_both'];
    
    for (const method of valuationMethods) {
      try {
        const result = await engine.calculateSmartEngine({
          quote: testQuote,
          currency_code: 'USD',
          exchange_rate: 1,
          origin_currency: 'INR',
          destination_currency: 'NPR',
          tax_calculation_preferences: {
            calculation_method_preference: 'hsn_only',
            valuation_method_preference: method
          }
        });

        if (result.success) {
          const valuationData = result.updated_quote?.calculation_data?.valuation_applied;
          const customsBase = valuationData?.customs_calculation_base || 0;
          const actualBase = valuationData?.original_items_total || 0;
          const adjustment = customsBase !== actualBase;

          console.log(`✅ ${method}:`);
          console.log(`   Original: $${actualBase}`);
          console.log(`   Customs Base: $${customsBase}`);
          console.log(`   Adjustment: ${adjustment ? 'YES' : 'NO'}`);
          console.log(`   Method Applied: ${valuationData?.method || 'unknown'}`);
          
          // Validate expectations
          if (method === 'product_value' && customsBase !== 1000) {
            console.log(`   ⚠️  WARNING: Expected $1000, got $${customsBase}`);
          }
          if (method === 'minimum_valuation' && customsBase <= 1000) {
            console.log(`   ⚠️  WARNING: Expected > $1000 (minimum), got $${customsBase}`);
          }
          if (method === 'higher_of_both' && customsBase < 1000) {
            console.log(`   ⚠️  WARNING: Expected >= $1000 (higher), got $${customsBase}`);
          }
        } else {
          console.log(`❌ ${method}: Calculation failed - ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ ${method}: Error - ${error.message}`);
      }
    }
    console.log('');

    // Test 4: Database checks
    console.log('📊 TEST 4: Database Integrity');
    console.log('=============================');
    
    try {
      // Check if supabase is available
      if (typeof supabase !== 'undefined') {
        // Check HSN master
        const { data: hsnData, error: hsnError } = await supabase
          .from('hsn_master')
          .select('hsn_code, tax_data')
          .limit(3);
          
        if (hsnError) {
          console.log(`❌ HSN Master: ${hsnError.message}`);
        } else {
          console.log(`✅ HSN Master: ${hsnData.length} records accessible`);
          const withoutTaxData = hsnData.filter(h => !h.tax_data?.typical_rates);
          if (withoutTaxData.length > 0) {
            console.log(`   ⚠️  ${withoutTaxData.length} records missing tax_data.typical_rates`);
          }
        }

        // Check route tiers
        const { data: routeData, error: routeError } = await supabase
          .from('route_customs_tiers')
          .select('customs_percentage')
          .eq('origin_country', 'IN')
          .eq('destination_country', 'NP')
          .limit(1);
          
        if (routeError) {
          console.log(`❌ Route Tiers: ${routeError.message}`);
        } else {
          console.log(`✅ Route Tiers: ${routeData.length} IN→NP routes found`);
          if (routeData.length === 0) {
            console.log(`   ⚠️  No IN→NP route customs tiers configured`);
          }
        }
      } else {
        console.log('❌ Supabase not available for database checks');
      }
    } catch (error) {
      console.log(`❌ Database check failed: ${error.message}`);
    }

    // Summary and recommendations
    console.log('\n🚨 CRITICAL ISSUES SUMMARY');
    console.log('==========================');
    console.log('1. **Hardcoded VAT Rates**: Move to database configuration');
    console.log('2. **Hardcoded Fallbacks**: Replace with dynamic lookups');
    console.log('3. **HSN Rate Validation**: Verify 0% customs are intentional');
    console.log('4. **Valuation Methods**: Test minimum valuation calculations');
    console.log('');
    console.log('📋 RECOMMENDED FIXES:');
    console.log('• Create vat_rates table with country-specific rates');
    console.log('• Remove hardcoded 13%, 18% from HSNTaxService');
    console.log('• Remove hardcoded 18%, 10% from SmartCalculationEngine');
    console.log('• Add configuration service for tax defaults');
    console.log('• Verify HSN minimum valuation data exists');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
})();

// Make it available globally
window.runDetailedTaxAnalysis = () => {
  // Re-run the analysis
  return runDetailedAnalysis();
};

console.log('✅ Detailed Tax Analysis loaded!');
console.log('Run: runDetailedTaxAnalysis()');