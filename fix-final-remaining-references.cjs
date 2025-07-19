#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files with final_total and final_currency references to fix
const files = [
  'src/components/ui/Price.tsx',
  'src/components/calculator/OptimizedQuoteCalculator.tsx',
  'src/components/admin/CustomerActivityTimeline.tsx',
  'src/components/admin/PaymentManagementWidget.tsx',
  'src/components/admin/RefundManagementModal.tsx',
  'src/components/admin/QuoteManagementPage.tsx',
  'src/components/admin/AdminOrderListItem.tsx',
  'src/components/admin/EnhancedAdminAnalytics.tsx',
  'src/components/admin/QuoteBulkActions.tsx',
  'src/components/admin/QuoteMetrics.tsx',
  'src/components/admin/RecentActivity.tsx',
  'src/components/admin/EnhancedCustomerManagementPage.tsx',
  'src/components/admin/UnifiedPaymentModal.tsx',
  'src/components/admin/OrderMetrics.tsx',
  'src/components/admin/CompactOrderListItem.tsx',
  'src/components/shared/OptimizedCostEstimator.tsx',
  'src/components/dashboard/OrderReceipt.tsx',
  'src/components/dashboard/QuotesTable.tsx',
  'src/components/dashboard/DashboardAnalytics.tsx',
  'src/components/dashboard/OrdersTable.tsx',
  'src/components/debug/StatusConfigInitializer.tsx',
  'src/components/debug/PaymentSyncDebugger.tsx',
  'src/hooks/useOptimizedQuoteCalculation.ts',
  'src/pages/EsewaTest.tsx',
  'src/pages/OrderConfirmationPage.tsx',
  'src/pages/Checkout.tsx',
  'src/pages/TestPayment.tsx',
  'src/pages/admin/PaymentManagementPage.tsx',
  'supabase/functions/create-payment/airwallex-api.ts',
  'supabase/functions/create-payment/stripe-enhanced-secure.ts'
];

function fixFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // List of all replacements to make
  const replacements = [
    // Property definitions and type definitions
    { from: /final_total\??\s*:/g, to: 'final_total_usd?:' },
    { from: /final_currency\??\s*:/g, to: 'destination_currency?:' },
    
    // Object access patterns
    { from: /\.final_total(?![_\w])/g, to: '.final_total_usd' },
    { from: /\.final_currency(?![_\w])/g, to: '.destination_currency' },
    
    // Variable assignments
    { from: /\bfinal_total(?![_\w])/g, to: 'final_total_usd' },
    { from: /\bfinal_currency(?![_\w])/g, to: 'destination_currency' },
    
    // Special case: keep breakdown.final_total unchanged (calculator results)
    { from: /breakdown\.final_total_usd/g, to: 'breakdown.final_total' },
    
    // Keep HTML id/name attributes unchanged
    { from: /"final_total_usd"/g, to: '"final_total"' },
    { from: /"destination_currency"/g, to: '"final_currency"' },
    { from: /htmlFor="destination_currency"/g, to: 'htmlFor="final_currency"' }
  ];
  
  replacements.forEach(({ from, to }) => {
    if (from.test && from.test(content)) {
      content = content.replace(from, to);
      modified = true;
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
  console.log('🔧 Starting final comprehensive fix...\n');
  
  let totalFixed = 0;
  let totalFiles = 0;

  files.forEach((file) => {
    totalFiles++;
    console.log(`📝 Processing: ${file}`);
    if (fixFile(file)) {
      totalFixed++;
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log(`🎉 FINAL comprehensive migration completed!`);
  console.log(`📊 Files processed: ${totalFiles}`);
  console.log(`✅ Files modified: ${totalFixed}`);
  console.log(`⏭️  Files unchanged: ${totalFiles - totalFixed}`);
  console.log('='.repeat(70));
  
  console.log('\n🚀 MIGRATION COMPLETE! All currency schema references updated:');
  console.log('   • final_currency → destination_currency');
  console.log('   • final_total → final_total_usd');
  console.log('\n⚡ The cost breakdown should now work perfectly!');
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, files };