import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Files that should be modified to remove notification references
const filesToUpdate = [
  'src/services/PackageForwardingService.ts',
  'src/components/admin/SystemSettings.tsx', 
  'src/pages/QuoteRequestPage.tsx',
  'src/components/quote/ProductInfoStep.tsx',
  'src/services/CloudflareQueuesService.ts',
  'src/services/IntelligentWorkflowService.ts',
  'src/services/EnhancedSupportService.ts',
  'src/services/UnifiedUserContextService.ts'
];

const processFile = (filePath: string) => {
  const fullPath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Remove notification imports
  content = content.replace(/import.*notification.*from.*;\n?/gi, '');
  content = content.replace(/import.*Notification.*from.*;\n?/gi, '');
  
  // Remove notification function calls and references
  content = content.replace(/\.notification[A-Za-z_]*\([^)]*\)[^;]*;?\n?/gi, '');
  content = content.replace(/notification[A-Za-z_]*\([^)]*\)[^;]*;?\n?/gi, '');
  
  // Remove notification properties and configurations
  content = content.replace(/notification[A-Za-z_]*:\s*[^,}]+[,}]?\n?/gi, '');
  content = content.replace(/['"']notification[^'"']*['"][^,}]*[,}]?\n?/gi, '');
  
  // Remove notification-related comments
  content = content.replace(/\/\/.*notification.*\n/gi, '');
  content = content.replace(/\/\*.*notification.*\*\/\n?/gi, '');
  
  // Remove notification-related JSX elements (if any)
  content = content.replace(/<[^>]*notification[^>]*>.*?<\/[^>]*>/gi, '');
  
  // Clean up empty lines and formatting
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  content = content.replace(/,\s*,/g, ',');
  content = content.replace(/,(\s*[}\]])/g, '$1');
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`📝 No changes needed: ${filePath}`);
  }
};

// Process all files
console.log('🧹 Removing notification references from codebase...\n');

filesToUpdate.forEach(processFile);

console.log('\n✅ Notification code references removal completed!');
console.log('📋 Summary:');
console.log('- Removed notification imports');
console.log('- Removed notification function calls');
console.log('- Removed notification properties');
console.log('- Cleaned up notification-related JSX');
console.log('- Fixed formatting and empty lines');