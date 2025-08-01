import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const supabaseUrl = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ';

console.log('🔍 Checking production Supabase for email_messages table...\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTable() {
  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('email_messages')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.error('❌ Table "email_messages" does not exist in production!');
        console.log('\n📝 To create it, run this SQL in Supabase Dashboard:');
        console.log('https://supabase.com/dashboard/project/grgvlrvywsfmnmkxrecd/editor');
        console.log('\nThen paste the contents of: apply-email-messages-table.sql');
      } else {
        console.error('❌ Error querying table:', error);
      }
    } else {
      console.log('✅ Table "email_messages" exists in production!');
      console.log(`Found ${data?.length || 0} records`);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkTable();