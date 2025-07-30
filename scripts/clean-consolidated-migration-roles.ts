import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationFile = path.join(__dirname, '../supabase/migrations/00000000000000_initial_complete_database.sql');

// Read the migration file
let content = fs.readFileSync(migrationFile, 'utf8');

console.log('🧹 Cleaning role references from consolidated migration...\n');

// Remove role-related blocks
const blocksToRemove = [
  // user_roles table and related objects
  /-- Name: user_roles.*?;[\s\S]*?(?=-- Name:|$)/g,
  
  // Role-related functions
  /-- Name: has_role.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: has_any_role.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: check_user_admin.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: get_user_permissions_new.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: get_user_roles_new.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: maintain_role_hierarchy.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: prevent_lower_role_insert.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: cleanup_lower_roles.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: create_user_role_on_signup.*?;[\s\S]*?(?=-- Name:|$)/g,
  
  // Indexes, triggers, constraints related to roles
  /-- Name: .*user_roles.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: .*role.*trigger.*?;[\s\S]*?(?=-- Name:|$)/g,
];

let removedCount = 0;
blocksToRemove.forEach(pattern => {
  const matches = content.match(pattern);
  if (matches) {
    removedCount += matches.length;
    content = content.replace(pattern, '');
  }
});

// Clean up any remaining role references
content = content.replace(/INSERT INTO.*user_roles.*?;\n?/gi, '');
content = content.replace(/ALTER TABLE.*user_roles.*?;\n?/gi, '');
content = content.replace(/CREATE INDEX.*user_roles.*?;\n?/gi, '');
content = content.replace(/GRANT.*user_roles.*?;\n?/gi, '');

// Clean up empty lines
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

// Write back the cleaned content
fs.writeFileSync(migrationFile, content);

console.log(`✅ Cleaned consolidated migration file`);
console.log(`📊 Removed ${removedCount} role-related blocks`);
console.log('📋 Removed:');
console.log('- user_roles table definition');
console.log('- All role-related function definitions');
console.log('- Role-related indexes and triggers');
console.log('- Role-related INSERT statements');
console.log('🔧 Cleaned up empty lines and formatting');