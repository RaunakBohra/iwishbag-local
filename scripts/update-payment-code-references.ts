#!/usr/bin/env ts-node

/**
 * Script to update code references from old payment tables to consolidated structure
 * Run this after applying the database migration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

// Define the table mappings
const TABLE_MAPPINGS = {
  // Old table -> New table/column mappings
  'payment_ledger': {
    table: 'payment_transactions',
    notes: 'Now consolidated into payment_transactions with all fields preserved'
  },
  'financial_transactions': {
    table: 'payment_transactions',
    notes: 'Accounting fields added to payment_transactions (debit_account, credit_account, etc.)'
  },
  'guest_checkout_sessions': {
    table: 'checkout_sessions',
    notes: 'Use is_guest=true filter for guest checkouts'
  },
  'authenticated_checkout_sessions': {
    table: 'checkout_sessions',
    notes: 'Use is_guest=false filter for authenticated checkouts'
  },
  'paypal_refunds': {
    table: 'gateway_refunds',
    notes: 'Use gateway_type="paypal" filter, PayPal data in metadata field'
  }
};

// Code patterns to replace
const CODE_REPLACEMENTS = [
  // Supabase client queries
  {
    pattern: /from\(['"]payment_ledger['"]\)/g,
    replacement: 'from("payment_transactions")',
    description: 'Update payment_ledger queries'
  },
  {
    pattern: /from\(['"]financial_transactions['"]\)/g,
    replacement: 'from("payment_transactions")',
    description: 'Update financial_transactions queries'
  },
  {
    pattern: /from\(['"]guest_checkout_sessions['"]\)/g,
    replacement: 'from("checkout_sessions").eq("is_guest", true)',
    description: 'Update guest checkout queries'
  },
  {
    pattern: /from\(['"]authenticated_checkout_sessions['"]\)/g,
    replacement: 'from("checkout_sessions").eq("is_guest", false)',
    description: 'Update authenticated checkout queries'
  },
  {
    pattern: /from\(['"]paypal_refunds['"]\)/g,
    replacement: 'from("gateway_refunds").eq("gateway_type", "paypal")',
    description: 'Update PayPal refund queries'
  },
  
  // Type imports
  {
    pattern: /Tables<['"]payment_ledger['"]\>/g,
    replacement: 'Tables<"payment_transactions">',
    description: 'Update payment_ledger types'
  },
  {
    pattern: /Tables<['"]financial_transactions['"]\>/g,
    replacement: 'Tables<"payment_transactions">',
    description: 'Update financial_transactions types'
  },
  {
    pattern: /Tables<['"]guest_checkout_sessions['"]\>/g,
    replacement: 'Tables<"checkout_sessions"> & { is_guest: true }',
    description: 'Update guest checkout types'
  },
  {
    pattern: /Tables<['"]authenticated_checkout_sessions['"]\>/g,
    replacement: 'Tables<"checkout_sessions"> & { is_guest: false }',
    description: 'Update authenticated checkout types'
  },
  
  // SQL queries in migrations
  {
    pattern: /INSERT INTO payment_ledger/g,
    replacement: 'INSERT INTO payment_transactions',
    description: 'Update INSERT statements'
  },
  {
    pattern: /UPDATE payment_ledger/g,
    replacement: 'UPDATE payment_transactions',
    description: 'Update UPDATE statements'
  },
  {
    pattern: /DELETE FROM payment_ledger/g,
    replacement: 'DELETE FROM payment_transactions',
    description: 'Update DELETE statements'
  }
];

// Files to check
const FILE_PATTERNS = [
  'src/**/*.{ts,tsx}',
  'supabase/migrations/*.sql',
  'supabase/functions/**/*.ts'
];

// Special handling for service files
const SERVICE_UPDATES = {
  'PaymentService.ts': [
    {
      old: 'createPaymentLedgerEntry',
      new: 'createPaymentTransaction',
      note: 'Rename method to match new table'
    },
    {
      old: 'createFinancialTransaction',
      new: 'createPaymentTransaction',
      note: 'Consolidate into single method'
    }
  ],
  'PaymentReconciliationService.ts': [
    {
      old: 'matchPaymentLedger',
      new: 'matchPaymentTransactions',
      note: 'Update reconciliation logic'
    }
  ]
};

async function updateFiles() {
  console.log('🔍 Scanning for files to update...\n');
  
  let totalUpdates = 0;
  const updatedFiles = new Set<string>();
  
  for (const pattern of FILE_PATTERNS) {
    const files = glob.sync(pattern, { ignore: ['**/node_modules/**', '**/dist/**'] });
    
    for (const file of files) {
      let content = fs.readFileSync(file, 'utf8');
      let originalContent = content;
      let fileUpdates = 0;
      
      // Apply general replacements
      for (const replacement of CODE_REPLACEMENTS) {
        const matches = content.match(replacement.pattern);
        if (matches) {
          content = content.replace(replacement.pattern, replacement.replacement);
          fileUpdates += matches.length;
          console.log(`📝 ${path.relative(process.cwd(), file)}: ${replacement.description} (${matches.length} occurrences)`);
        }
      }
      
      // Apply service-specific updates
      const fileName = path.basename(file);
      if (SERVICE_UPDATES[fileName]) {
        for (const update of SERVICE_UPDATES[fileName]) {
          const regex = new RegExp(update.old, 'g');
          const matches = content.match(regex);
          if (matches) {
            content = content.replace(regex, update.new);
            fileUpdates += matches.length;
            console.log(`🔧 ${fileName}: ${update.note} (${matches.length} occurrences)`);
          }
        }
      }
      
      // Write back if changed
      if (content !== originalContent) {
        fs.writeFileSync(file, content);
        updatedFiles.add(file);
        totalUpdates += fileUpdates;
      }
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`- Files updated: ${updatedFiles.size}`);
  console.log(`- Total replacements: ${totalUpdates}`);
  
  if (updatedFiles.size > 0) {
    console.log('\n📁 Updated files:');
    for (const file of updatedFiles) {
      console.log(`  - ${path.relative(process.cwd(), file)}`);
    }
  }
  
  // Generate migration notes
  console.log('\n📋 Migration Notes:');
  console.log('1. Run the database migration first: supabase db push');
  console.log('2. Regenerate TypeScript types: npm run supabase:generate-types');
  console.log('3. Test payment flows thoroughly');
  console.log('4. Monitor for any errors in payment processing');
  console.log('\n⚠️  Important changes:');
  console.log('- payment_ledger → payment_transactions');
  console.log('- guest_checkout_sessions → checkout_sessions with is_guest=true');
  console.log('- PayPal refund data now in gateway_refunds.metadata field');
}

// Create a pre-flight check function
async function preflightCheck() {
  console.log('🔍 Pre-flight check...\n');
  
  // Check if types file exists
  const typesFile = 'src/integrations/supabase/types.ts';
  if (!fs.existsSync(typesFile)) {
    console.error('❌ Types file not found. Please run: npm run supabase:generate-types');
    process.exit(1);
  }
  
  // Check for backup tables in migration
  const migrationFile = 'supabase/migrations/20250130000000_consolidate_payment_tables.sql';
  if (!fs.existsSync(migrationFile)) {
    console.error('❌ Migration file not found. Please ensure the migration is created.');
    process.exit(1);
  }
  
  console.log('✅ Pre-flight checks passed\n');
}

// Main execution
async function main() {
  console.log('🚀 Payment Table Consolidation - Code Update Script\n');
  
  await preflightCheck();
  
  console.log('⚠️  This script will update your code to use consolidated payment tables.');
  console.log('Make sure you have:');
  console.log('1. Committed your current changes');
  console.log('2. Applied the database migration');
  console.log('3. Have a backup of your code\n');
  
  // In a real script, we'd prompt for confirmation here
  // For now, we'll just proceed
  
  await updateFiles();
  
  console.log('\n✅ Code update complete!');
  console.log('\nNext steps:');
  console.log('1. Run: npm run supabase:generate-types');
  console.log('2. Run: npm run typecheck');
  console.log('3. Test your payment flows');
  console.log('4. Run: npm test');
}

// Run the script
main().catch(console.error);