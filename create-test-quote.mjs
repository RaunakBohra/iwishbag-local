import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createTestQuote() {
  console.log('Creating test quote...');
  
  // First, get or create a test user
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);
    
  let userId = users?.[0]?.id;
  
  if (!userId) {
    // Create a test user if none exists
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'test123456',
      email_confirm: true
    });
    userId = user?.user?.id || '00000000-0000-0000-0000-000000000000';
  }
  
  const testQuote = {
    user_id: userId,
    email: 'test@example.com',
    country_code: 'US',
    currency: 'USD',
    product_name: 'Test Product',
    product_url: 'https://example.com/product',
    item_price: 100,
    final_total: 100.50,
    quantity: 1,
    status: 'approved',
    in_cart: true,
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
    console.log('💰 Amount:', data.final_total, data.currency);
    return data.id;
  }
}

createTestQuote();