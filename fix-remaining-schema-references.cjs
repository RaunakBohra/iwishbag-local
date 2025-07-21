#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files and their required fixes
const fixes = [
  // Dashboard pages
  {
    file: 'src/pages/dashboard/QuoteDetailUnified.tsx',
    replacements: [{ from: 'quote.final_total', to: 'quote.final_total_usd' }],
  },
  {
    file: 'src/pages/dashboard/OrderDetail.tsx',
    replacements: [{ from: 'order.final_total', to: 'order.final_total_usd' }],
  },
  {
    file: 'src/pages/dashboard/Quotes.tsx',
    replacements: [{ from: 'quote.final_total', to: 'quote.final_total_usd' }],
  },
  {
    file: 'src/pages/dashboard/QuoteDetail.tsx',
    replacements: [{ from: 'quote.final_total', to: 'quote.final_total_usd' }],
  },
  {
    file: 'src/pages/dashboard/Orders.tsx',
    replacements: [{ from: 'order.final_total', to: 'order.final_total_usd' }],
  },
  // Payment test files
  {
    file: 'src/components/payment/__tests__/PaymentCurrencyHandling.test.tsx',
    replacements: [
      { from: 'final_total:', to: 'final_total_usd:' },
      { from: 'final_currency:', to: 'destination_currency:' },
    ],
  },
  {
    file: 'src/components/payment/__tests__/RefundCurrencyValidation.test.tsx',
    replacements: [
      { from: 'final_total:', to: 'final_total_usd:' },
      { from: 'final_currency:', to: 'destination_currency:' },
    ],
  },
  // Supabase functions that weren't in our target list
  {
    file: 'supabase/functions/expire-quotes/index.ts',
    replacements: [{ from: 'final_total', to: 'final_total_usd' }],
  },
  {
    file: 'supabase/functions/create-airwallex-payment/index.ts',
    replacements: [{ from: 'quote.final_total', to: 'quote.final_total_usd' }],
  },
  {
    file: 'supabase/functions/paypal-refund/index.ts',
    replacements: [{ from: 'final_total', to: 'final_total_usd' }],
  },
  {
    file: 'supabase/functions/create-paypal-invoice/index.ts',
    replacements: [{ from: 'quote.final_total', to: 'quote.final_total_usd' }],
  },
  {
    file: 'supabase/functions/submit-automatic-quote/index.ts',
    replacements: [{ from: 'final_total', to: 'final_total_usd' }],
  },
  {
    file: 'supabase/functions/create-paypal-checkout/index.ts',
    replacements: [{ from: 'final_total', to: 'final_total_usd' }],
  },
  {
    file: 'supabase/functions/payment-webhook/index.ts',
    replacements: [{ from: 'final_total', to: 'final_total_usd' }],
  },
  {
    file: 'supabase/functions/esewa-callback/index.ts',
    replacements: [{ from: 'final_total', to: 'final_total_usd' }],
  },
  {
    file: 'supabase/functions/payment-recovery/index.ts',
    replacements: [
      { from: 'final_total', to: 'final_total_usd' },
      { from: 'final_currency', to: 'destination_currency' },
    ],
  },
  {
    file: 'supabase/functions/__tests__/airwallex-api.test.ts',
    replacements: [
      { from: 'final_total:', to: 'final_total_usd:' },
      { from: 'final_currency:', to: 'destination_currency:' },
    ],
  },
];

function fixFile(filePath, replacements) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  replacements.forEach(({ from, to }) => {
    // Use global regex to replace all occurrences
    const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (content.includes(from)) {
      content = content.replace(regex, to);
      modified = true;
      console.log(`  ✅ Replaced "${from}" with "${to}"`);
    }
  });

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`⏭️  No changes needed: ${filePath}`);
    return false;
  }
}

function main() {
  console.log('🔧 Starting comprehensive schema migration fixes...\n');

  let totalFixed = 0;
  let totalFiles = 0;

  fixes.forEach(({ file, replacements }) => {
    totalFiles++;
    console.log(`\n📝 Processing: ${file}`);
    if (fixFile(file, replacements)) {
      totalFixed++;
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`🎉 Migration completed!`);
  console.log(`📊 Files processed: ${totalFiles}`);
  console.log(`✅ Files modified: ${totalFixed}`);
  console.log(`⏭️  Files unchanged: ${totalFiles - totalFixed}`);
  console.log('='.repeat(60));

  if (totalFixed > 0) {
    console.log('\n✅ Database schema migration is now complete!');
    console.log('🚀 All references updated from:');
    console.log('   • final_currency → destination_currency');
    console.log('   • final_total → final_total_usd');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, fixes };
