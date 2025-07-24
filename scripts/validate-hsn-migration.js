#!/usr/bin/env node

/**
 * HSN Migration Validation Script
 * Validates the integrity of HSN migration results
 */

console.log('🔍 HSN Migration Validation');
console.log('========================');

import { createClient } from '@supabase/supabase-js';

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateHSNMigration() {
  try {
    console.log('📊 Validating JSONB items structure...');
    
    // Get all quotes with items
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('*')
      .not('items', 'is', null);
    
    if (quotesError) {
      throw new Error(`Failed to fetch quotes: ${quotesError.message}`);
    }
    
    let structureIssues = 0;
    let hsnConsistencyIssues = 0;
    let migrationIssues = 0;
    let totalItems = 0;
    let classifiedItems = 0;
    
    console.log(`📝 Validating ${quotes.length} quotes...`);
    
    for (const quote of quotes) {
      if (!Array.isArray(quote.items)) {
        structureIssues++;
        console.log(`❌ Quote ${quote.id}: items is not an array`);
        continue;
      }
      
      // Check migration completeness
      const shouldBeMigrated = quote.items.length > 0;
      const isMigrated = quote.operational_data?.hsn_migration_completed;
      const hasCorrectMethod = quote.operational_data?.calculation_method === 'per_item_hsn';
      
      if (shouldBeMigrated && (!isMigrated || !hasCorrectMethod)) {
        migrationIssues++;
        console.log(`⚠️  Quote ${quote.id}: incomplete migration (migrated: ${isMigrated}, method: ${quote.operational_data?.calculation_method})`);
      }
      
      // Validate each item
      for (const item of quote.items) {
        totalItems++;
        
        // Structure validation
        if (!item.id || !item.name || typeof item.price_usd !== 'number') {
          structureIssues++;
          console.log(`❌ Quote ${quote.id}, item ${item.id}: invalid structure`);
        }
        
        // HSN validation
        if (item.hsn_code) {
          classifiedItems++;
          
          // Check HSN code format
          if (!/^\d{2,8}$/.test(item.hsn_code)) {
            hsnConsistencyIssues++;
            console.log(`❌ Quote ${quote.id}, item ${item.id}: invalid HSN code format: ${item.hsn_code}`);
          }
          
          // Check category presence
          if (!item.category) {
            hsnConsistencyIssues++;
            console.log(`❌ Quote ${quote.id}, item ${item.id}: HSN code without category`);
          }
          
          // Validate against HSN master (simple check)
          const { data: hsnRecord } = await supabase
            .from('hsn_master')
            .select('hsn_code, category')
            .eq('hsn_code', item.hsn_code)
            .eq('is_active', true)
            .single();
          
          if (!hsnRecord) {
            hsnConsistencyIssues++;
            console.log(`❌ Quote ${quote.id}, item ${item.id}: HSN code ${item.hsn_code} not found in master database`);
          } else if (hsnRecord.category !== item.category) {
            hsnConsistencyIssues++;
            console.log(`❌ Quote ${quote.id}, item ${item.id}: category mismatch - has '${item.category}' but HSN ${item.hsn_code} requires '${hsnRecord.category}'`);
          }
        }
      }
    }
    
    // Summary
    console.log('\n📋 Validation Summary');
    console.log('===================');
    console.log(`📊 Total quotes validated: ${quotes.length}`);
    console.log(`📦 Total items validated: ${totalItems}`);
    console.log(`🏷️  Items with HSN codes: ${classifiedItems}`);
    console.log(`✅ Classification rate: ${totalItems > 0 ? Math.round((classifiedItems / totalItems) * 100) : 0}%`);
    
    console.log('\n🚨 Issues Found:');
    console.log(`   Structure issues: ${structureIssues}`);
    console.log(`   Migration issues: ${migrationIssues}`);
    console.log(`   HSN consistency issues: ${hsnConsistencyIssues}`);
    
    const totalIssues = structureIssues + migrationIssues + hsnConsistencyIssues;
    
    if (totalIssues === 0) {
      console.log('\n🎉 All validations passed! Migration integrity is excellent.');
      return true;
    } else {
      console.log(`\n⚠️  Found ${totalIssues} issues that need attention.`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return false;
  }
}

// Run validation
validateHSNMigration().then(success => {
  process.exit(success ? 0 : 1);
});