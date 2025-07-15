import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testWebhookInsert() {
  console.log('🧪 Testing webhook_logs table insert...\n')
  
  // Try to insert a test webhook log
  const testLog = {
    webhook_type: 'stripe',
    status: 'test',
    error_message: 'Testing webhook insert from script',
    created_at: new Date().toISOString()
  }
  
  const { data, error } = await supabase
    .from('webhook_logs')
    .insert(testLog)
    .select()
    .single()
  
  if (error) {
    console.error('❌ Error inserting webhook log:', error)
    console.log('\nTrying with minimal fields...')
    
    // Try with just required fields
    const { data: minimalData, error: minimalError } = await supabase
      .from('webhook_logs')
      .insert({
        webhook_type: 'stripe'
      })
      .select()
      .single()
    
    if (minimalError) {
      console.error('❌ Still failed:', minimalError)
    } else {
      console.log('✅ Minimal insert succeeded:', minimalData)
    }
  } else {
    console.log('✅ Test webhook log inserted:', data)
  }
  
  // Check what was actually inserted
  console.log('\n📋 Checking recent webhook_logs...')
  const { data: recentLogs } = await supabase
    .from('webhook_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3)
  
  if (recentLogs) {
    console.log('Recent logs:', recentLogs)
  }
}

testWebhookInsert().catch(console.error)