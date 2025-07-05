// Update User Profile for PayU Testing
const updateUserProfile = async () => {
  console.log('🔄 Updating user profile for PayU testing...\n');

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('❌ No user found. Please log in first.');
      return;
    }

    console.log('✅ User found:', user.id);

    // Update profile to India for PayU testing
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
      console.log('✅ Profile updated successfully:');
      console.log('   Country: IN (India)');
      console.log('   Currency: INR');
      console.log('   COD Enabled: true');
      console.log('\n🔄 Please refresh your checkout page to see PayU option.');
    }

  } catch (error) {
    console.log('❌ Error:', error);
  }
};

// Run the update
updateUserProfile(); 