#!/usr/bin/env node

/**
 * HSN Migration Script
 * Runs HSN migration on existing quotes in development environment
 */

// Import the migration service (we'll need to transpile this or use a simple approach)
console.log('🚀 Starting HSN Migration for Existing Quotes');
console.log('======================================');

import { createClient } from '@supabase/supabase-js';

// Local Supabase configuration
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runHSNMigration() {
  try {
    console.log('📊 Analyzing quotes needing migration...');
    
    // Get quotes that need migration
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('*')
      .not('items', 'is', null);
    
    if (quotesError) {
      throw new Error(`Failed to fetch quotes: ${quotesError.message}`);
    }
    
    console.log(`📝 Found ${quotes.length} quotes to analyze`);
    
    let migratedCount = 0;
    let itemsClassified = 0;
    
    for (const quote of quotes) {
      if (!quote.items || quote.items.length === 0) {
        console.log(`⏭️  Skipping quote ${quote.id} - no items`);
        continue;
      }
      
      // Check if already migrated
      if (quote.operational_data?.hsn_migration_completed) {
        console.log(`✅ Quote ${quote.id} already migrated`);
        continue;
      }
      
      console.log(`🔍 Processing quote ${quote.id} with ${quote.items.length} items`);
      
      // Simple HSN classification based on item names
      const updatedItems = quote.items.map(item => {
        if (item.hsn_code) {
          console.log(`   ✅ Item "${item.name}" already has HSN code: ${item.hsn_code}`);
          return item;
        }
        
        // Simple classification logic
        let hsnCode = '';
        let category = '';
        
        const itemName = item.name.toLowerCase();
        
        if (itemName.includes('kurta') || itemName.includes('shirt') || itemName.includes('dress')) {
          hsnCode = '6109';
          category = 'clothing';
        } else if (itemName.includes('iphone') || itemName.includes('phone') || itemName.includes('mobile')) {
          hsnCode = '8517';
          category = 'electronics';
        } else if (itemName.includes('book') || itemName.includes('novel')) {
          hsnCode = '4901';
          category = 'books';
        } else if (itemName.includes('toy') || itemName.includes('game')) {
          hsnCode = '9503';
          category = 'toys';
        } else {
          // Default to electronics
          hsnCode = '8517';
          category = 'electronics';
        }
        
        console.log(`   🏷️  Classified "${item.name}" as HSN ${hsnCode} (${category})`);
        itemsClassified++;
        
        return {
          ...item,
          hsn_code: hsnCode,
          category: category,
          smart_data: {
            ...item.smart_data,
            hsn_classification_method: 'auto',
            hsn_classification_confidence: 0.8,
            hsn_migration_date: new Date().toISOString(),
          }
        };
      });
      
      // Update the quote with classified items
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          items: updatedItems,
          operational_data: {
            ...quote.operational_data,
            hsn_tax_calculation: true,
            hsn_migration_date: new Date().toISOString(),
            calculation_method: 'per_item_hsn',
            hsn_migration_completed: true,
            hsn_items_total: updatedItems.length,
            hsn_items_classified: updatedItems.filter(item => item.hsn_code).length,
          }
        })
        .eq('id', quote.id);
      
      if (updateError) {
        throw new Error(`Failed to update quote ${quote.id}: ${updateError.message}`);
      }
      
      console.log(`✅ Successfully migrated quote ${quote.id}`);
      migratedCount++;
    }
    
    console.log('\n🎉 Migration Complete!');
    console.log('==================');
    console.log(`📊 Quotes migrated: ${migratedCount}`);
    console.log(`🏷️  Items classified: ${itemsClassified}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runHSNMigration();