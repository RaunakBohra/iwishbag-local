import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const typesFilePath = path.join(__dirname, '../src/integrations/supabase/types.ts');

// Read the current types file
let content = fs.readFileSync(typesFilePath, 'utf8');

console.log('🧹 Removing role-related types from types.ts...\n');

// Patterns to remove role-related types
const patternsToRemove = [
  // user_roles table definition
  /\s*user_roles: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  
  // Role-related function definitions
  /\s*check_user_admin: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*create_user_role_on_signup: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*get_user_permissions_new: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*get_user_roles_new: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*has_role: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*has_any_role: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*maintain_role_hierarchy: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
];

let removedCount = 0;
patternsToRemove.forEach(pattern => {
  const matches = content.match(pattern);
  if (matches) {
    removedCount += matches.length;
    content = content.replace(pattern, '');
  }
});

// Clean up any double commas or trailing commas that might result
content = content.replace(/,\s*,/g, ',');
content = content.replace(/,(\s*\})/g, '$1');

// Write the updated content back
fs.writeFileSync(typesFilePath, content);

console.log(`✅ Role types removed from types.ts`);
console.log(`📊 Removed ${removedCount} role-related type definitions`);
console.log('Removed:');
console.log('- user_roles table type');
console.log('- check_user_admin function type');
console.log('- get_user_permissions_new function type');
console.log('- get_user_roles_new function type');
console.log('- has_role function type');
console.log('- has_any_role function type');
console.log('- Role-related function signatures');