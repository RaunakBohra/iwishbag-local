import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const typesFilePath = path.join(__dirname, '../src/integrations/supabase/types.ts');

// Read the current types file
let content = fs.readFileSync(typesFilePath, 'utf8');

// Patterns to remove notification-related types
const patternsToRemove = [
  // Table definitions
  /\s*customer_notification_preferences: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*customer_notification_profiles: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*customer_package_notifications: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*notification_preferences_unified: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*notification_templates: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*notifications: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*package_notifications: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  
  // View definitions
  /\s*user_notification_settings: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  
  // Function definitions
  /\s*cleanup_expired_notifications: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*create_default_notification_preferences: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*get_notification_response_metrics: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*get_notification_statistics: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*get_package_notification_statistics: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*get_unread_notification_count: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*get_user_notification_settings: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*mark_all_notifications_read: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*mark_overdue_package_notifications: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  /\s*should_send_notification: \{[^}]*(\{[^}]*\}[^}]*)*\},?\n/gs,
  
  // References to notification tables
  /referencedRelation: "user_notification_settings"/g,
];

// Apply all removals
patternsToRemove.forEach(pattern => {
  content = content.replace(pattern, '');
});

// Clean up any double commas or trailing commas that might result
content = content.replace(/,\s*,/g, ',');
content = content.replace(/,(\s*\})/g, '$1');

// Write the updated content back
fs.writeFileSync(typesFilePath, content);

console.log('✅ Notification types removed from types.ts');
console.log('Removed:');
console.log('- customer_notification_preferences table type');
console.log('- customer_notification_profiles table type');
console.log('- customer_package_notifications table type');
console.log('- notification_preferences_unified table type');
console.log('- notification_templates table type');
console.log('- notifications table type');
console.log('- package_notifications table type');
console.log('- user_notification_settings view type');
console.log('- 9 notification-related function types');
console.log('- All references to user_notification_settings');