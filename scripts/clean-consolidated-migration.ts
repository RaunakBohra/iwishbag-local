import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationFile = path.join(__dirname, '../supabase/migrations/00000000000000_initial_complete_database.sql');

// Read the migration file
let content = fs.readFileSync(migrationFile, 'utf8');

console.log('🧹 Cleaning notification references from consolidated migration...\n');

// Remove notification-related blocks
const blocksToRemove = [
  // Functions
  /-- Name: cleanup_expired_notifications.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: create_default_notification_preferences.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: get_notification_.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: get_package_notification_.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: get_unread_notification_.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: get_user_notification_.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: handle_new_user_notification_.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: mark_.*notification.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: should_send_notification.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: trigger_package_notification_.*?;[\s\S]*?(?=-- Name:|$)/g,
  
  // Tables
  /-- Name: notification.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: customer_notification.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: customer_package_notification.*?;[\s\S]*?(?=-- Name:|$)/g,
  /-- Name: package_notification.*?;[\s\S]*?(?=-- Name:|$)/g,
  
  // Views
  /-- Name: user_notification_settings.*?;[\s\S]*?(?=-- Name:|$)/g,
  
  // Indexes, triggers, etc.
  /-- Name: .*notification.*?;[\s\S]*?(?=-- Name:|$)/g,
];

let removedCount = 0;
blocksToRemove.forEach(pattern => {
  const matches = content.match(pattern);
  if (matches) {
    removedCount += matches.length;
    content = content.replace(pattern, '');
  }
});

// Clean up any remaining notification references
content = content.replace(/INSERT INTO.*notification.*?;\n?/gi, '');
content = content.replace(/ALTER TABLE.*notification.*?;\n?/gi, '');
content = content.replace(/CREATE INDEX.*notification.*?;\n?/gi, '');
content = content.replace(/GRANT.*notification.*?;\n?/gi, '');

// Clean up empty lines
content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

// Write back the cleaned content
fs.writeFileSync(migrationFile, content);

console.log(`✅ Cleaned consolidated migration file`);
console.log(`📊 Removed ${removedCount} notification-related blocks`);
console.log('🔧 Cleaned up empty lines and formatting');