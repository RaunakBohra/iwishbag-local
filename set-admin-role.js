import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'http://127.0.0.1:54321'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setAdminRole() {
  try {
    console.log('Setting admin role for test user...')
    
    const userId = '5d8064b4-64e2-437e-b597-866ca7ea4570'
    
    // Try to insert or update user role
    const { data, error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Error setting admin role:', error)
      
      // Try alternative approach - check current role first
      const { data: currentRole, error: fetchError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (fetchError) {
        console.log('No existing role found, inserting new role...')
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'admin'
          })
        
        if (insertError) {
          console.error('Insert error:', insertError)
        } else {
          console.log('Admin role inserted successfully!')
        }
      } else {
        console.log('Current role:', currentRole)
        const { error: updateError } = await supabase
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', userId)
        
        if (updateError) {
          console.error('Update error:', updateError)
        } else {
          console.log('Admin role updated successfully!')
        }
      }
    } else {
      console.log('Admin role set successfully:', data)
    }

  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

setAdminRole()