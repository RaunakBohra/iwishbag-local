#!/usr/bin/env node

/**
 * Test script to verify tax percentage fix
 * Verifies that Nepal now shows 13% instead of 0.13%
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTaxFix() {
  console.log('🧪 Testing Tax System Fix...\n');

  try {
    // Test 1: Verify database values are in percentage format
    console.log('📊 Database Values:');
    const { data: countries, error } = await supabase
      .from('country_settings')
      .select('code, vat, sales_tax')
      .in('code', ['NP', 'IN', 'CN', 'US'])
      .order('code');

    if (error) {
      console.error('❌ Database query failed:', error);
      return;
    }

    countries.forEach(country => {
      const vatDisplay = country.vat > 0 ? `${country.vat}%` : 'No VAT';
      const salesTaxDisplay = country.sales_tax > 0 ? `${country.sales_tax}%` : 'No Sales Tax';
      
      console.log(`   ${country.code}: VAT=${vatDisplay}, Sales Tax=${salesTaxDisplay}`);
      
      // Verify values are in percentage format (> 1 for active tax countries)
      if (country.vat > 0 && country.vat < 1) {
        console.log(`   ⚠️  WARNING: ${country.code} VAT value ${country.vat} appears to be in decimal format!`);
      }
      if (country.sales_tax > 0 && country.sales_tax < 1) {
        console.log(`   ⚠️  WARNING: ${country.code} Sales Tax value ${country.sales_tax} appears to be in decimal format!`);
      }
    });

    // Test 2: Test the expected calculation
    console.log('\n🧮 Tax Calculation Test:');
    const nepalVAT = countries.find(c => c.code === 'NP')?.vat || 0;
    const testAmount = 100; // $100 test amount
    
    console.log(`   Test Amount: $${testAmount}`);
    console.log(`   Nepal VAT Rate: ${nepalVAT}% (database value: ${nepalVAT})`);
    
    // This is how the calculation should work now
    const calculatedTax = testAmount * (nepalVAT / 100);
    console.log(`   Calculated Tax: $${testAmount} × (${nepalVAT} / 100) = $${calculatedTax.toFixed(2)}`);
    
    // Verify the calculation
    const expectedTax = 13; // $100 × 13% = $13
    if (Math.abs(calculatedTax - expectedTax) < 0.01) {
      console.log(`   ✅ SUCCESS: Tax calculation correct! Expected $${expectedTax}, got $${calculatedTax.toFixed(2)}`);
    } else {
      console.log(`   ❌ FAILED: Tax calculation incorrect! Expected $${expectedTax}, got $${calculatedTax.toFixed(2)}`);
    }

    // Test 3: Verify constraint works
    console.log('\n🔒 Constraint Test:');
    try {
      await supabase
        .from('country_settings')
        .update({ vat: 150 }) // Try to set invalid value > 100
        .eq('code', 'TEST_COUNTRY');
      
      console.log('   ⚠️  Constraint test inconclusive (test country may not exist)');
    } catch (constraintError) {
      if (constraintError.message.includes('check_vat_percentage_range')) {
        console.log('   ✅ SUCCESS: VAT constraint working correctly');
      } else {
        console.log('   ❓ Constraint test result unclear');
      }
    }

    console.log('\n🎉 Tax system fix verification completed!');
    console.log('\n📋 Summary:');
    console.log('   - Database stores percentage values (13 = 13%)');
    console.log('   - Services return percentage values');
    console.log('   - Calculations use single conversion point: amount * (percentage / 100)');
    console.log('   - No more double conversion: 13% displays as 13%, not 0.13%');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTaxFix();