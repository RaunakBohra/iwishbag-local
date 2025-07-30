#!/usr/bin/env ts-node

/**
 * Script to update all references to old checkout session tables
 * Updates to use the new consolidated checkout_sessions table
 */

import * as fs from 'fs';
import * as path from 'path';

// Files that need updating based on grep results
const filesToUpdate = [
  'src/services/CheckoutSessionService.ts',
  'src/pages/PaymentSuccess.tsx',
  'src/utils/recordTestPayment.ts',
  'src/pages/PaypalSuccess.tsx',
  'supabase/functions/create-payment/index.ts',
  'supabase/functions/payu-refund/index.ts',
];

// Replacements to make
const replacements = [
  // Table name replacements
  {
    old: `.from('guest_checkout_sessions')`,
    new: `.from('checkout_sessions')`,
    note: 'Update table name'
  },
  {
    old: `.from('authenticated_checkout_sessions')`,
    new: `.from('checkout_sessions')`,
    note: 'Update table name'
  },
  // Field name replacements
  {
    old: 'shipping_address:',
    new: 'temporary_shipping_address:',
    note: 'Unified field name'
  },
  {
    old: 'quote_id:',
    new: 'quote_ids: [',
    note: 'Single to array - needs manual fix'
  },
  // Type replacements
  {
    old: `Tables<'guest_checkout_sessions'>`,
    new: `Tables<'checkout_sessions'> & { is_guest: true }`,
    note: 'Update type with guest flag'
  },
  {
    old: `Tables<'authenticated_checkout_sessions'>`,
    new: `Tables<'checkout_sessions'> & { is_guest: false }`,
    note: 'Update type with guest flag'
  },
  {
    old: `Tables<'payment_ledger'>`,
    new: `Tables<'payment_transactions'>`,
    note: 'Update payment ledger type'
  },
];

// Special handling for different file types
const fileHandlers: Record<string, (content: string) => string> = {
  // Handle guest session queries - add is_guest filter
  'PaymentSuccess.tsx': (content) => {
    return content.replace(
      /\.from\('checkout_sessions'\)\s*\.select/g,
      `.from('checkout_sessions')
        .select`
    ).replace(
      /\.eq\('session_token', sessionToken\)/g,
      `.eq('session_token', sessionToken)
        .eq('is_guest', true)`
    );
  },
  
  // Handle authenticated session queries - add is_guest=false filter
  'CheckoutSessionService.ts': (content) => {
    // For authenticated methods, add is_guest=false
    content = content.replace(
      /\.from\('checkout_sessions'\)\s*\.insert\(\{[\s\S]*?user_id: request\.user_id,/g,
      (match) => match.replace(
        'status: \'active\',',
        'status: \'active\',\n          is_guest: false,'
      )
    );
    
    // For guest methods, ensure is_guest=true is added
    content = content.replace(
      /\.from\('checkout_sessions'\)\s*\.select\(\)/g,
      `.from('checkout_sessions')
        .select()
        .eq('is_guest', true)`
    );
    
    return content;
  },
  
  // Handle payment ledger references
  'recordTestPayment.ts': (content) => {
    return content.replace(
      /\.from\('payment_ledger'\)/g,
      `.from('payment_transactions')`
    );
  },
};

async function updateFile(filePath: string) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Apply general replacements
    for (const replacement of replacements) {
      if (content.includes(replacement.old)) {
        content = content.replace(new RegExp(replacement.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement.new);
        console.log(`✅ ${path.basename(filePath)}: ${replacement.note}`);
      }
    }
    
    // Apply file-specific handlers
    const fileName = path.basename(filePath);
    if (fileHandlers[fileName]) {
      content = fileHandlers[fileName](content);
    }
    
    // Special handling for quote_id to quote_ids conversion
    if (content.includes('quote_ids: [')) {
      // Fix array syntax where needed
      content = content.replace(/quote_ids: \[([^,\]]+),/g, 'quote_ids: [$1],');
    }
    
    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content);
      console.log(`📝 Updated: ${filePath}`);
    } else {
      console.log(`✓ No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error);
  }
}

async function main() {
  console.log('🔄 Updating checkout session references...\n');
  
  for (const file of filesToUpdate) {
    await updateFile(file);
  }
  
  console.log('\n✅ Update complete!');
  console.log('\n⚠️  Manual review needed for:');
  console.log('1. quote_id to quote_ids array conversions');
  console.log('2. Ensure is_guest filters are properly applied');
  console.log('3. Test checkout flows (both guest and authenticated)');
}

main().catch(console.error);