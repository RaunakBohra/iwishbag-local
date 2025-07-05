// Fix User Profile for PayU Testing
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzAsImV4cCI6MjA1MDU0ODk3MH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

const fixProfile = async () => {
  console.log('🔧 Fixing user profile for PayU testing...');

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ No user found. Please log in first.');
      return;
    }

    console.log('✅ User found:', user.email);

    // Update profile to India
    const { data, error } = await supabase
      .from('profiles')
      .update({
        country: 'IN',
        preferred_display_currency: 'INR',
        cod_enabled: true
      })
      .eq('id', user.id)
      .select();

    if (error) {
      console.log('❌ Error updating profile:', error);
    } else {
      console.log('✅ Profile updated successfully!');
      console.log('   Country: IN (India)');
      console.log('   Currency: INR');
      console.log('   COD Enabled: true');
      console.log('\n🔄 Please refresh your checkout page now.');
    }

  } catch (error) {
    console.log('❌ Error:', error);
  }
};

// Run the fix
fixProfile(); 