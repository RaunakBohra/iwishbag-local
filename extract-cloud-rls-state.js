import { createClient } from '@supabase/supabase-js'

async function extractCloudRLSState() {
  console.log('🔍 Extracting Cloud Database RLS State...')
  
  // Use service role to bypass RLS for schema inspection
  const client = createClient(
    'https://grgvlrvywsfmnmkxrecd.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
  )

  try {
    console.log('\n📊 Getting RLS enabled tables...')
    
    // Get all tables with RLS enabled
    const { data: rlsEnabledTables, error: rlsError } = await client.rpc('sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
        ORDER BY tablename;
      `
    })

    if (rlsError) {
      console.error('❌ Error getting RLS tables:', rlsError.message)
      
      // Fallback: try direct query
      const { data: tablesData, error: tablesError } = await client
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name')
        
      if (!tablesError && tablesData) {
        console.log(`\n📋 Found ${tablesData.length} total public tables in cloud`)
        console.log('First 10 tables:', tablesData.slice(0, 10).map(t => t.table_name).join(', '))
      }
    } else {
      console.log(`\n✅ Found ${rlsEnabledTables?.length || 0} tables with RLS enabled`)
      if (rlsEnabledTables) {
        rlsEnabledTables.forEach(table => {
          console.log(`  - ${table.tablename}`)
        })
      }
    }

    console.log('\n🛡️ Getting current policies...')
    
    // Get all current policies
    const { data: policies, error: policiesError } = await client.rpc('sql', {
      query: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies 
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `
    })

    if (policiesError) {
      console.error('❌ Error getting policies:', policiesError.message)
    } else {
      console.log(`\n✅ Found ${policies?.length || 0} current policies`)
      
      // Group by table
      const policiesByTable = {}
      policies?.forEach(policy => {
        if (!policiesByTable[policy.tablename]) {
          policiesByTable[policy.tablename] = []
        }
        policiesByTable[policy.tablename].push(policy.policyname)
      })
      
      Object.keys(policiesByTable).sort().forEach(tableName => {
        console.log(`  ${tableName}: ${policiesByTable[tableName].length} policies`)
        policiesByTable[tableName].forEach(policyName => {
          console.log(`    - ${policyName}`)
        })
      })
    }

    // Check for critical functions
    console.log('\n🔧 Checking critical functions...')
    
    const functions = ['is_admin', 'is_authenticated', 'has_role']
    for (const func of functions) {
      try {
        const { data, error } = await client.rpc(func)
        if (!error) {
          console.log(`  ✅ ${func}(): Available (returns: ${data})`)
        } else {
          console.log(`  ❌ ${func}(): ${error.message}`)
        }
      } catch (err) {
        console.log(`  ❌ ${func}(): ${err.message}`)
      }
    }

    console.log('\n📈 Summary:')
    console.log(`  - RLS Enabled Tables: ${rlsEnabledTables?.length || 0}`)
    console.log(`  - Total Policies: ${policies?.length || 0}`)
    console.log(`  - Available Functions: ${functions.filter(async f => {
      try {
        const { error } = await client.rpc(f)
        return !error
      } catch {
        return false
      }
    }).length}`)

  } catch (err) {
    console.error('❌ Failed to extract cloud RLS state:', err.message)
    console.log('\n🔄 This might be due to API key issues or network problems.')
    console.log('The extraction will continue with local data for comparison.')
  }
}

extractCloudRLSState().catch(console.error)