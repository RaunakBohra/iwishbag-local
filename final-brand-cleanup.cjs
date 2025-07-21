const fs = require('fs');
const path = require('path');

// Additional color mappings for final cleanup
const colorMappings = {
  // Blue variants
  'from-blue-50 to-purple-50': 'from-teal-50 to-orange-50',
  'from-purple-50 to-pink-50': 'from-orange-50 to-red-50',
  'to-blue-50': 'to-teal-50',
  'bg-blue-50': 'bg-teal-50',
  'text-blue-600': 'text-teal-600',
  'text-blue-700': 'text-teal-700',
  'text-blue-800': 'text-teal-800',
  'border-blue-200': 'border-teal-200',
  'border-blue-300': 'border-teal-300',
  'bg-blue-100': 'bg-teal-100',
  'bg-blue-600': 'bg-teal-600',
  'from-blue-500 to-indigo-600': 'from-teal-500 to-cyan-600',
  'hover:from-blue-600 hover:to-indigo-700': 'hover:from-teal-600 hover:to-cyan-700',

  // Purple variants
  'bg-purple-50': 'bg-orange-50',
  'text-purple-600': 'text-orange-600',
  'text-purple-700': 'text-orange-700',
  'text-purple-800': 'text-orange-800',
  'border-purple-200': 'border-orange-200',
  'border-purple-300': 'border-orange-300',
  'bg-purple-100': 'bg-orange-100',
  'bg-purple-600': 'bg-orange-600',

  // Indigo variants
  'bg-indigo-50': 'bg-cyan-50',
  'text-indigo-600': 'text-cyan-600',
  'text-indigo-700': 'text-cyan-700',
  'text-indigo-800': 'text-cyan-800',
  'border-indigo-200': 'border-cyan-200',
  'border-indigo-300': 'border-cyan-300',
  'bg-indigo-100': 'bg-cyan-100',
  'bg-indigo-600': 'bg-cyan-600',

  // Specific numeric variants
  'blue-500': 'teal-500',
  'blue-600': 'teal-600',
  'blue-700': 'teal-700',
  'purple-500': 'orange-500',
  'purple-600': 'orange-600',
  'purple-700': 'orange-700',
  'indigo-500': 'cyan-500',
  'indigo-600': 'cyan-600',
  'indigo-700': 'cyan-700',
};

// Files that still need cleanup (from grep results)
const filesToCleanup = [
  'src/pages/About.tsx',
  'src/components/landing/CostEstimator.tsx',
  'src/pages/PaymentFailure.tsx',
  'src/pages/PaymentSuccess.tsx',
  'src/pages/EsewaTest.tsx',
  'src/pages/OrderConfirmationPage.tsx',
  'src/pages/PaypalSuccess.tsx',
  'src/pages/Dashboard.tsx',
  'src/pages/auth/ResetPassword.tsx',
  'src/pages/auth/EmailConfirmation.tsx',
  'src/pages/NotFound.tsx',
  'src/components/AddressHistory.tsx',
  'src/components/admin/AdminAddressEditor.tsx',
  'src/components/admin/PaymentGatewayManagement.tsx',
  'src/components/admin/AdminQuoteDetailPage.tsx',
  'src/components/landing/HowItWorks.tsx',
  'src/components/home/EnhancedHowItWorksSection.tsx',
  'src/components/home/CountriesSection.tsx',
  'src/pages/dashboard/QuoteDetailUnified.tsx',
  'src/pages/dashboard/QuoteDetail.tsx',
  'src/pages/admin/StatusManagement.tsx',
  'src/components/forms/CustomerDeliveryInfo.tsx',
  'src/components/profile/PaymentMethodDebug.tsx',
  'src/components/admin/StatusTransitionHistory.tsx',
  'src/components/admin/EmailTemplateManager.tsx',
];

let totalUpdatedFiles = 0;
let totalReplacements = 0;

function updateFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let fileChanged = false;
    let fileReplacements = 0;

    // Apply color mappings
    Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
      const regex = new RegExp(oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, newColor);
        fileChanged = true;
        fileReplacements += matches.length;
        console.log(`  ✓ ${oldColor} → ${newColor} (${matches.length} times)`);
      }
    });

    if (fileChanged) {
      fs.writeFileSync(fullPath, content, 'utf8');
      totalUpdatedFiles++;
      totalReplacements += fileReplacements;
      console.log(`✅ Updated ${filePath} (${fileReplacements} replacements)`);
      return true;
    } else {
      console.log(`⚪ No changes needed in ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

console.log('🎨 Final Brand Cleanup - Processing remaining files...\n');

filesToCleanup.forEach((filePath, index) => {
  console.log(`📁 Processing ${index + 1}/${filesToCleanup.length}: ${filePath}`);
  updateFile(filePath);
  console.log('');
});

console.log('🎯 Final Brand Cleanup Summary:');
console.log(`✅ Files processed: ${filesToCleanup.length}`);
console.log(`📝 Files updated: ${totalUpdatedFiles}`);
console.log(`🔄 Total replacements: ${totalReplacements}`);
console.log('\n🎨 Brand consistency cleanup complete!');
