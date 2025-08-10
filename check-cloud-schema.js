import { createClient } from '@supabase/supabase-js'

async function checkCloudSchema() {
  console.log('🔍 Checking Cloud Database Schema...')
  
  // Connect with service_role key to access schema info
  const client = createClient(
    'https://grgvlrvywsfmnmkxrecd.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3Zscnp5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzQ2NjY0OSwiZXhwIjoyMDUzMDQyNjQ5fQ.oI1Ge5dY0_bKYUKXoXhxqWRX4LJJnX9oUtyG2fNNRuU' // service_role key
  )

  console.log('\n📊 Checking critical tables schema...')

  const criticalTables = [
    'profiles',
    'user_roles', 
    'quotes_v2',
    'delivery_addresses',
    'messages',
    'support_system',
    'customer_preferences',
    'consolidation_groups'
  ]

  for (const table of criticalTables) {
    try {
      // Get column info for each table
      const { data, error } = await client
        .rpc('column_info', { table_name: table })

      if (error) {
        console.log(`  ${table}: ❌ ERROR - ${error.message}`)
        
        // Fallback: try to select with LIMIT 0 to get column info
        const { data: testData, error: testError } = await client
          .from(table)
          .select('*')
          .limit(0)
          
        if (!testError) {
          console.log(`  ${table}: ✅ EXISTS (fallback check)`)
        }
        continue
      }

      if (data && data.length > 0) {
        const columns = data.map(col => col.column_name).sort()
        console.log(`  ${table}: ✅ EXISTS`)
        console.log(`    Columns: ${columns.slice(0, 8).join(', ')}${columns.length > 8 ? '...' : ''}`)
      } else {
        console.log(`  ${table}: ⚠️  NO COLUMNS INFO`)
      }

    } catch (err) {
      console.log(`  ${table}: ❌ EXCEPTION - ${err.message}`)
    }
  }

  // Check if tables exist at all
  console.log('\n🔍 Checking table existence...')
  
  for (const table of criticalTables) {
    try {
      const { data, error } = await client
        .from(table)
        .select('id')
        .limit(1)
      
      const status = error ? '❌ MISSING' : '✅ EXISTS'
      console.log(`  ${table}: ${status}`)
      
      if (error && error.message) {
        console.log(`    Error: ${error.message}`)
      }
    } catch (err) {
      console.log(`  ${table}: ❌ ERROR - ${err.message}`)
    }
  }

  console.log('\n✅ Cloud Schema Check Complete!')
}

checkCloudSchema().catch(console.error)