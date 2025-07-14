import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

async function testRPCWithAuth() {
  console.log('=== TESTING RPC FUNCTION WITH AUTH ===');
  
  // First, try to sign in as an admin user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'iwbtracking@gmail.com', // Assuming this is an admin user
    password: 'your_password_here'   // You'll need to provide the actual password
  });
  
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  console.log('Auth successful, user:', authData.user);
  
  // Now test the RPC function
  const { data, error } = await supabase.rpc('force_update_payment', {
    quote_id: 'e3af638c-f2b3-4447-952c-41ff49a36561',
    new_amount_paid: 617.14,
    new_payment_status: 'paid'
  });
  
  console.log('RPC Result:', { data, error });
  
  // Check the database after update
  const { data: checkData, error: checkError } = await supabase
    .from('quotes')
    .select('amount_paid, payment_status')
    .eq('id', 'e3af638c-f2b3-4447-952c-41ff49a36561')
    .single();
    
  console.log('Database after update:', { checkData, checkError });
}

testRPCWithAuth();