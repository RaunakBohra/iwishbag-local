// Debug eSewa URL issue by checking what's stored in the database
const { createClient } = await import('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

try {
  // Check the current eSewa configuration
  const { data, error } = await supabase
    .from('payment_gateways')
    .select('code, config')
    .eq('code', 'esewa')
    .single();

  if (error) {
    console.error('Error fetching eSewa config:', error);
    process.exit(1);
  }

  console.log('eSewa Gateway Config:');
  console.log('Raw config:', JSON.stringify(data.config, null, 2));
  
  const testUrl = data.config.test_url;
  const liveUrl = data.config.live_url;
  
  console.log('\nURL Analysis:');
  console.log('Test URL:', testUrl);
  console.log('Test URL length:', testUrl.length);
  console.log('Live URL:', liveUrl);
  console.log('Live URL length:', liveUrl.length);
  
  // Check for any non-printable characters
  console.log('\nTest URL character codes:');
  console.log(testUrl.split('').map((c, i) => `${i}: '${c}' (${c.charCodeAt(0)})`));
  
  // Test if there are any hidden characters
  const cleanTestUrl = testUrl.replace(/[^\x20-\x7E]/g, '');
  console.log('\nCleaned test URL:', cleanTestUrl);
  console.log('URLs match:', testUrl === cleanTestUrl);
  
  // Test URL encoding
  console.log('\nURL encoding test:');
  console.log('Original:', testUrl);
  console.log('Encoded:', encodeURIComponent(testUrl));
  console.log('Double encoded:', encodeURIComponent(encodeURIComponent(testUrl)));
  
} catch (error) {
  console.error('Script error:', error);
  process.exit(1);
}