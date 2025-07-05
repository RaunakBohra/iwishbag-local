// Test Payment Methods Debug
const testPaymentMethods = async () => {
  console.log('🔍 Debugging Payment Methods...\n');

  try {
    // Test 1: Check user profile
    console.log('1️⃣ Checking user profile...');
    const { data: { user } } = await supabase.auth.getUser();
    console.log('User ID:', user?.id);

    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('country, preferred_display_currency, cod_enabled')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.log('❌ Profile Error:', profileError);
      } else {
        console.log('✅ User Profile:', profile);
      }
    }

    // Test 2: Check payment gateways
    console.log('\n2️⃣ Checking payment gateways...');
    const { data: gateways, error: gatewaysError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('is_active', true);

    if (gatewaysError) {
      console.log('❌ Gateways Error:', gatewaysError);
    } else {
      console.log('✅ Active Gateways:', gateways);
    }

    // Test 3: Check PayU specifically
    console.log('\n3️⃣ Checking PayU configuration...');
    const { data: payuGateway, error: payuError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('code', 'payu')
      .single();

    if (payuError) {
      console.log('❌ PayU Gateway Error:', payuError);
    } else {
      console.log('✅ PayU Gateway:', payuGateway);
    }

    // Test 4: Simulate payment method filtering
    console.log('\n4️⃣ Simulating payment method filtering...');
    if (profile && gateways) {
      const countryCode = profile.country;
      const currencyCode = profile.preferred_display_currency;
      
      console.log('User Country:', countryCode);
      console.log('User Currency:', currencyCode);
      
      const filteredGateways = gateways.filter(gateway => {
        const countryMatch = gateway.supported_countries.includes(countryCode);
        const currencyMatch = gateway.supported_currencies.includes(currencyCode);
        
        console.log(`Gateway ${gateway.code}:`);
        console.log(`  - Country match: ${countryMatch} (${gateway.supported_countries} includes ${countryCode})`);
        console.log(`  - Currency match: ${currencyMatch} (${gateway.supported_currencies} includes ${currencyCode})`);
        console.log(`  - Is active: ${gateway.is_active}`);
        
        return countryMatch && currencyMatch && gateway.is_active;
      });
      
      console.log('\n✅ Available Payment Methods:', filteredGateways.map(g => g.code));
    }

  } catch (error) {
    console.log('❌ Test Error:', error);
  }
};

// Run the test
testPaymentMethods(); 