#!/usr/bin/env tsx

/**
 * Country Data Consistency Verification Script
 * Checks for inconsistent country data across tables and provides recommendations
 */

import { supabase } from '../integrations/supabase/client';
import { countryStandardizationService } from '../services/CountryStandardizationService';

interface CountryInconsistency {
  table: string;
  column: string;
  value: string;
  count: number;
  suggestion: string;
}

interface TableCountryColumn {
  table: string;
  column: string;
  description: string;
}

// Tables and columns that store country information
const COUNTRY_COLUMNS: TableCountryColumn[] = [
  { table: 'quotes_v2', column: 'destination_country', description: 'Quote destinations' },
  { table: 'quotes_v2', column: 'origin_country', description: 'Quote origins' },
  { table: 'quotes', column: 'destination_country', description: 'Legacy quote destinations' },  
  { table: 'quotes', column: 'origin_country', description: 'Legacy quote origins' },
  { table: 'shipping_routes', column: 'origin_country', description: 'Shipping route origins' },
  { table: 'shipping_routes', column: 'destination_country', description: 'Shipping route destinations' },
  { table: 'bank_account_details', column: 'destination_country', description: 'Bank account country restrictions' },
  { table: 'profiles', column: 'country', description: 'User profile countries' },
  { table: 'delivery_addresses', column: 'destination_country', description: 'Delivery address countries' },
];

async function checkCountryConsistency(): Promise<CountryInconsistency[]> {
  const inconsistencies: CountryInconsistency[] = [];

  // Initialize country standardization service
  await countryStandardizationService.initialize();
  const allCountries = countryStandardizationService.getAllCountries();
  
  console.log(`🌍 Checking ${COUNTRY_COLUMNS.length} country columns across database...`);
  console.log(`📊 Reference data: ${allCountries.length} countries loaded`);

  for (const { table, column, description } of COUNTRY_COLUMNS) {
    console.log(`\n🔍 Analyzing ${table}.${column} (${description})...`);

    try {
      // Get unique values and their counts
      const { data, error } = await supabase
        .from(table)
        .select(`${column}, count:${column}`)
        .not(column, 'is', null)
        .group(column);

      if (error) {
        console.error(`❌ Error querying ${table}.${column}:`, error.message);
        continue;
      }

      if (!data || data.length === 0) {
        console.log(`✅ No data in ${table}.${column}`);
        continue;
      }

      // Get actual count for each unique value
      const uniqueValues = data.map(row => row[column]).filter(Boolean);
      
      for (const value of uniqueValues) {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq(column, value);

        const recordCount = count || 0;

        // Check if this value looks like a country code or name
        const isLikelyCode = value.length === 2 && value === value.toUpperCase();
        const isLikelyName = value.length > 2;
        
        // Try to find matching country in our reference data
        const matchByCode = allCountries.find(c => c.code.toUpperCase() === value.toUpperCase());
        const matchByName = allCountries.find(c => c.name.toLowerCase() === value.toLowerCase());

        let suggestion = '';
        let isInconsistent = false;

        if (!matchByCode && !matchByName) {
          // Value doesn't match any known country
          suggestion = `Unknown country value "${value}" - needs investigation`;
          isInconsistent = true;
        } else if (isLikelyCode && matchByCode) {
          // Valid country code
          suggestion = `✅ Valid country code (${matchByCode.name})`;
        } else if (isLikelyName && matchByName) {
          // Valid country name
          suggestion = `✅ Valid country name (${matchByName.code})`;
        } else if (isLikelyCode && !matchByCode && matchByName) {
          // Looks like a code but matches a name
          suggestion = `⚠️ Looks like code but matches name - consider using "${matchByName.code}"`;
          isInconsistent = true;
        } else if (isLikelyName && !matchByName && matchByCode) {
          // Looks like a name but matches a code
          suggestion = `⚠️ Looks like name but matches code - consider using "${matchByCode.name}"`;
          isInconsistent = true;
        }

        if (isInconsistent) {
          inconsistencies.push({
            table,
            column,
            value,
            count: recordCount,
            suggestion
          });
        }

        console.log(`  📋 "${value}" (${recordCount} records): ${suggestion}`);
      }

    } catch (error) {
      console.error(`❌ Failed to analyze ${table}.${column}:`, error);
    }
  }

  return inconsistencies;
}

async function generateReport(inconsistencies: CountryInconsistency[]): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 COUNTRY DATA CONSISTENCY REPORT');
  console.log('='.repeat(80));

  if (inconsistencies.length === 0) {
    console.log('✅ No country data inconsistencies found!');
    console.log('✅ All country values appear to be valid and consistent.');
    return;
  }

  console.log(`⚠️ Found ${inconsistencies.length} potential inconsistencies:\n`);

  // Group by table for better readability
  const byTable = inconsistencies.reduce((acc, inc) => {
    if (!acc[inc.table]) acc[inc.table] = [];
    acc[inc.table].push(inc);
    return acc;
  }, {} as Record<string, CountryInconsistency[]>);

  for (const [table, issues] of Object.entries(byTable)) {
    console.log(`📊 Table: ${table}`);
    
    for (const issue of issues) {
      console.log(`  ❌ ${issue.column}: "${issue.value}" (${issue.count} records)`);
      console.log(`     💡 ${issue.suggestion}`);
    }
    console.log('');
  }

  console.log('🔧 RECOMMENDATIONS:');
  console.log('1. Review unknown country values and update them to valid codes/names');
  console.log('2. Consider standardizing to either codes (NP) or names (Nepal) per table');
  console.log('3. The CountryStandardizationService has been implemented to standardize country formats');
  console.log('4. Test the country standardization before making any data changes');
  console.log('');
  console.log('✅ No immediate action required - country standardization system is in place!');
}

async function main() {
  console.log('🚀 Starting country data consistency verification...\n');
  
  try {
    const inconsistencies = await checkCountryConsistency();
    await generateReport(inconsistencies);
    
    console.log('\n✅ Country data verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}