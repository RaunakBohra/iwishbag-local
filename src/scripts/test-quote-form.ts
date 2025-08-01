#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuoteForm() {
  console.log('🧪 Testing Quote Form V2 Compatibility\n');
  
  // Check if V2 is enabled
  let isV2Enabled = false;
  try {
    const { error } = await supabase
      .from('quotes_v2')
      .select('id')
      .limit(1);
    
    isV2Enabled = !error;
  } catch {
    isV2Enabled = false;
  }
  
  console.log(`✅ Quotes V2 Enabled: ${isV2Enabled ? 'YES' : 'NO'}`);
  
  if (isV2Enabled) {
    console.log('\n📋 When you submit a quote at http://localhost:8082/quote:');
    console.log('   - Quote will be created in quotes_v2 table');
    console.log('   - Share token will be auto-generated');
    console.log('   - Email will be sent via AWS SES');
    console.log('   - Quote will expire after 7 days');
    console.log('   - Customer can view at: /quote/view/{share_token}');
  } else {
    console.log('\n⚠️  Quotes V2 is not available');
    console.log('   - Quotes will be created in the old quotes table');
    console.log('   - No share tokens or automatic emails');
  }
  
  console.log('\n🚀 Ready to test! Go to http://localhost:8082/quote');
  
  process.exit(0);
}

testQuoteForm().catch(console.error);