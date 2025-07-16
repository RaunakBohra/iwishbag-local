import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createTestUserAndQuote() {
  console.log('Creating test user...');
  
  // Create test user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'test@example.com',
    password: 'test123456',
    email_confirm: true
  });
  
  if (authError && \!authError.message.includes('already registered')) {
    console.error('Error creating user:', authError);
    return;
  }
  
  // Get user ID
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'test@example.com')
    .single();
    
  const userId = users?.id || authData?.user?.id;
  console.log('User ID:', userId);
  
  // Create test quote
  const testQuote = {
    user_id: userId,
    origin_country: 'US',
    destination_country: 'US',
    item_price: 100,
    item_currency: 'USD',
    final_total: 100.50,
    final_currency: 'USD',
    exchange_rate: 1,
    status: 'approved',
    in_cart: true,
    url: 'https://example.com/product',
    quantity: 1,
    product_name: 'Test Product',
    shipping_address: {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '+1234567890',
      address: {
        line1: '123 Test Street',
        city: 'Test City',
        state: 'CA',
        postal_code: '12345',
        country: 'US'
      }
    }
  };

  const { data, error } = await supabase
    .from('quotes')
    .insert(testQuote)
    .select()
    .single();

  if (error) {
    console.error('Error creating quote:', error);
  } else {
    console.log('✅ Test quote created:', data);
    console.log('\n📋 Quote ID:', data.id);
    console.log('💰 Amount:', data.final_total, data.final_currency);
    return data.id;
  }
}

createTestUserAndQuote();
