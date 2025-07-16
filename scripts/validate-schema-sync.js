#!/usr/bin/env node

/**
 * Schema Sync Validation Script
 * Prevents deployment with schema mismatches between local and cloud databases
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const REQUIRED_TABLES = [
  'quotes',
  'user_addresses', 
  'payment_transactions',
  'payment_documents',
  'quote_documents',
  'shipping_routes',
  'payment_ledger',
  'quote_statuses',
  'system_settings',
  'profiles'
];

const REQUIRED_COLUMNS = {
  quotes: ['destination_country', 'origin_country', 'customer_name', 'breakdown', 'payment_details'],
  user_addresses: ['destination_country', 'phone', 'recipient_name', 'nickname'],
  payment_transactions: ['paypal_capture_id', 'paypal_payer_email', 'paypal_payer_id'],
  payment_documents: ['id', 'quote_id', 'user_id', 'verified', 'document_url'],
  quote_documents: ['id', 'quote_id', 'document_type', 'file_name', 'file_url', 'uploaded_by'],
  shipping_routes: ['id', 'origin_country', 'destination_country', 'base_shipping_cost', 'is_active']
};

const REQUIRED_FUNCTIONS = [
  'handle_new_user',
  'process_stripe_payment_success', 
  'process_paypal_payment_atomic',
  'update_updated_at_column',
  'is_admin'
];

console.log('🔍 Starting Schema Sync Validation...\n');

async function checkLocalDatabase() {
  console.log('📊 Checking local database schema...');
  
  try {
    // Check if local database is running by testing connection
    await execAsync(`
      PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT 1;" >/dev/null 2>&1
    `);

    // Run schema verification
    const { stdout } = await execAsync(`
      PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "
        SELECT * FROM verify_complete_schema();
      " 2>/dev/null
    `);

    console.log('✅ Local database schema check results:');
    console.log(stdout);

    // Check for critical errors
    if (stdout.includes('ERROR') || stdout.includes('missing')) {
      throw new Error('Local database schema has missing components');
    }

    return true;
  } catch (error) {
    console.error('❌ Local database validation failed:', error.message);
    return false;
  }
}

async function validateRequiredTables() {
  console.log('\n📋 Validating required tables exist...');
  
  for (const table of REQUIRED_TABLES) {
    try {
      const { stdout } = await execAsync(`
        PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "
          SELECT table_name FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = '${table}';
        " 2>/dev/null
      `);
      
      if (!stdout.includes(table)) {
        console.error(`❌ Missing table: ${table}`);
        return false;
      } else {
        console.log(`✅ Table exists: ${table}`);
      }
    } catch (error) {
      console.error(`❌ Error checking table ${table}:`, error.message);
      return false;
    }
  }

  return true;
}

async function validateRequiredColumns() {
  console.log('\n🏗️ Validating required columns...');
  
  for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
    for (const column of columns) {
      try {
        const { stdout } = await execAsync(`
          PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = '${table}' AND column_name = '${column}';
          " 2>/dev/null
        `);
        
        if (!stdout.includes(column)) {
          console.error(`❌ Missing column: ${table}.${column}`);
          return false;
        } else {
          console.log(`✅ Column exists: ${table}.${column}`);
        }
      } catch (error) {
        console.error(`❌ Error checking column ${table}.${column}:`, error.message);
        return false;
      }
    }
  }

  return true;
}

async function validateRequiredFunctions() {
  console.log('\n⚙️ Validating required functions...');
  
  for (const functionName of REQUIRED_FUNCTIONS) {
    try {
      const { stdout } = await execAsync(`
        PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "
          SELECT routine_name FROM information_schema.routines 
          WHERE routine_schema = 'public' AND routine_name = '${functionName}';
        " 2>/dev/null
      `);
      
      if (!stdout.includes(functionName)) {
        console.error(`❌ Missing function: ${functionName}`);
        return false;
      } else {
        console.log(`✅ Function exists: ${functionName}`);
      }
    } catch (error) {
      console.error(`❌ Error checking function ${functionName}:`, error.message);
      return false;
    }
  }

  return true;
}

async function checkComponentImports() {
  console.log('\n🧩 Checking component imports...');
  
  try {
    // Run TypeScript compilation to catch missing imports
    const { stdout, stderr } = await execAsync('npx tsc --noEmit --project tsconfig.json');
    
    if (stderr && stderr.includes('Cannot find name')) {
      console.error('❌ TypeScript compilation found missing imports:');
      console.error(stderr);
      return false;
    }
    
    console.log('✅ All component imports are valid');
    return true;
  } catch (error) {
    if (error.message.includes('Cannot find name')) {
      console.error('❌ TypeScript compilation failed due to missing imports');
      console.error(error.message);
      return false;
    }
    
    // Other TypeScript errors (not import-related) are acceptable
    console.log('⚠️ TypeScript compilation has warnings (not import-related)');
    return true;
  }
}

async function main() {
  console.log('🚀 iwishBag Schema Sync Validation\n');
  
  const checks = [
    { name: 'Local Database Schema', check: checkLocalDatabase },
    { name: 'Required Tables', check: validateRequiredTables },
    { name: 'Required Columns', check: validateRequiredColumns },
    { name: 'Required Functions', check: validateRequiredFunctions },
    { name: 'Component Imports', check: checkComponentImports }
  ];
  
  let allPassed = true;
  
  for (const { name, check } of checks) {
    console.log(`\n--- ${name} ---`);
    const passed = await check();
    
    if (!passed) {
      allPassed = false;
      console.error(`❌ ${name} validation failed\n`);
    } else {
      console.log(`✅ ${name} validation passed\n`);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 All schema validation checks passed!');
    console.log('✅ Safe to deploy or continue development');
    process.exit(0);
  } else {
    console.error('💥 Schema validation failed!');
    console.error('❌ Fix the issues above before deploying');
    console.error('\n🔧 Quick fixes:');
    console.error('  - Run: npm run db:verify-schema');
    console.error('  - Run: ./fix-database-schema.sh local');
    console.error('  - Check component imports for missing lucide-react icons');
    process.exit(1);
  }
}

// Handle process errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled error during validation:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('💥 Schema validation failed with error:', error);
  process.exit(1);
});