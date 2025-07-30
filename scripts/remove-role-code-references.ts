import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Files that should be updated (excluding test files and reports)
const filesToUpdate = [
  'src/hooks/useCountrySettings.ts',
  'src/pages/MessageCenterPage.tsx',
  'src/pages/unified/UnifiedQuotePage.tsx',
  'src/hooks/useSystemSettings.ts',
  'src/hooks/useBankAccountSettings.ts',
  'src/hooks/useQuoteManagement.ts',
  'src/components/debug/StatusConfigInitializer.tsx',
  'src/components/messaging/QuoteMessaging.tsx',
  'src/components/messaging/MessageCenter.tsx',
  'src/components/support/TicketDetailView.tsx',
  'src/components/layout/Header.tsx',
  'src/contexts/QuoteThemeContext.tsx'
];

const processFile = (filePath: string) => {
  const fullPath = path.join(projectRoot, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Remove role-related imports
  content = content.replace(/import.*AdminProtectedRoute.*from.*;\n?/gi, '');
  content = content.replace(/import.*useAdminRole.*from.*;\n?/gi, '');
  content = content.replace(/import.*PermissionsProvider.*from.*;\n?/gi, '');
  content = content.replace(/import.*UserRoleEnsurer.*from.*;\n?/gi, '');
  content = content.replace(/import.*PermissionsTestCard.*from.*;\n?/gi, '');
  content = content.replace(/import.*usePermissions.*from.*;\n?/gi, '');
  content = content.replace(/import.*usePermissionsContext.*from.*;\n?/gi, '');
  
  // Remove role-related function calls and hooks
  content = content.replace(/const\s+\{\s*[^}]*useAdminRole[^}]*\}\s*=.*;\n?/gi, '');
  content = content.replace(/const\s+[^=]*=\s*useAdminRole\([^)]*\)[^;]*;\n?/gi, '');
  content = content.replace(/const\s+\{\s*[^}]*usePermissions[^}]*\}\s*=.*;\n?/gi, '');
  content = content.replace(/const\s+[^=]*=\s*usePermissions\([^)]*\)[^;]*;\n?/gi, '');
  
  // Remove role-related JSX components
  content = content.replace(/<AdminProtectedRoute[^>]*>.*?<\/AdminProtectedRoute>/gs, '');
  content = content.replace(/<PermissionsTestCard[^/>]*\/?>.*?(<\/PermissionsTestCard>)?/gs, '');
  content = content.replace(/<UserRoleEnsurer[^/>]*\/?>.*?(<\/UserRoleEnsurer>)?/gs, '');
  
  // Remove role-related conditions and checks
  content = content.replace(/if\s*\([^)]*isAdmin[^)]*\)\s*\{[^}]*\}/gs, '');
  content = content.replace(/\?\s*isAdmin[^:]*:/g, ' ?');
  content = content.replace(/isAdmin\s*&&[^;,}]*/g, 'true');
  
  // Remove role-related properties
  content = content.replace(/isAdmin[^,}]*[,}]?\n?/gi, '');
  content = content.replace(/adminRole[^,}]*[,}]?\n?/gi, '');
  
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
console.log('🧹 Removing role/permission references from codebase...\n');

filesToUpdate.forEach(processFile);

console.log('\n✅ Role/permission code references removal completed!');
console.log('📋 Summary:');
console.log('- Removed role-related imports');
console.log('- Removed role-related hooks and function calls');
console.log('- Removed role-related JSX components');
console.log('- Cleaned up role-based conditions');
console.log('- Fixed formatting and empty lines');