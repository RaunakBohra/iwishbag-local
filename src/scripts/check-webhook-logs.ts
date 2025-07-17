import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkWebhookLogs() {
  console.log('🔍 Checking webhook_logs table...\n');

  // Get all recent webhook logs
  const { data: logs, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error:', error);

    // Check if table exists
    console.log('\n🔍 Checking if webhook_logs table exists...');
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%webhook%');

    console.log('Tables with "webhook" in name:', tables);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log('No webhook logs found');
    return;
  }

  console.log(`Found ${logs.length} webhook logs:\n`);

  logs.forEach((log, index) => {
    console.log(`${index + 1}. Type: ${log.webhook_type || log.gateway_code || 'Unknown'}`);
    console.log(`   Processed: ${log.processed ? '✅' : '❌'}`);
    console.log(`   Created: ${new Date(log.created_at).toLocaleString()}`);
    if (log.error_message) {
      console.log(`   Error: ${log.error_message}`);
    }
    console.log('---');
  });
}

checkWebhookLogs().catch(console.error);
