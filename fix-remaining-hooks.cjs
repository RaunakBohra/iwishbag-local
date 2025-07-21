#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files and their required fixes
const fixes = [
  {
    file: 'src/services/__tests__/QuoteCalculatorService.test.ts',
    replacements: [
      { from: 'final_total:', to: 'final_total_usd:' },
      { from: 'final_currency:', to: 'destination_currency:' },
      { from: '.final_total', to: '.final_total_usd' },
      { from: '.final_currency', to: '.destination_currency' },
    ],
  },
  {
    file: 'src/scripts/check-specific-order.ts',
    replacements: [
      { from: 'final_total', to: 'final_total_usd' },
      { from: 'final_currency', to: 'destination_currency' },
    ],
  },
  {
    file: 'src/hooks/useStatusTransitions.ts',
    replacements: [{ from: 'final_total', to: 'final_total_usd' }],
  },
  {
    file: 'src/hooks/useQuoteState.ts',
    replacements: [{ from: 'final_total', to: 'final_total_usd' }],
  },
  {
    file: 'src/hooks/useQuoteMutations.ts',
    replacements: [{ from: 'final_total', to: 'final_total_usd' }],
  },
  {
    file: 'src/hooks/usePaginatedQuoteManagement.ts',
    replacements: [{ from: 'final_total', to: 'final_total_usd' }],
  },
  {
    file: 'src/hooks/useOptimizedQuoteCalculation.ts',
    replacements: [
      { from: 'final_total:', to: 'final_total_usd:' },
      { from: 'final_currency:', to: 'destination_currency:' },
    ],
  },
  {
    file: 'src/hooks/useEmailNotifications.ts',
    replacements: [{ from: 'final_total', to: 'final_total_usd' }],
  },
  {
    file: 'src/hooks/useDueAmountManager.ts',
    replacements: [{ from: 'final_total', to: 'final_total_usd' }],
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
  console.log('🔧 Starting final hook fixes...\n');

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
  console.log(`🎉 Final hook fixes completed!`);
  console.log(`📊 Files processed: ${totalFiles}`);
  console.log(`✅ Files modified: ${totalFixed}`);
  console.log(`⏭️  Files unchanged: ${totalFiles - totalFixed}`);
  console.log('='.repeat(60));

  if (totalFixed > 0) {
    console.log('\n✅ ALL currency schema migration fixes complete!');
    console.log('🚀 Updated remaining references from:');
    console.log('   • final_currency → destination_currency');
    console.log('   • final_total → final_total_usd');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, fixes };
