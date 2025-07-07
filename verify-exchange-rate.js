import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verifyExchangeRate() {
  try {
    console.log('Verifying exchange_rate field in shipping_routes...');
    
    const { data: routes, error: selectError } = await supabase
      .from('shipping_routes')
      .select('origin_country, destination_country, exchange_rate')
      .order('origin_country', { ascending: true })
      .order('destination_country', { ascending: true });

    if (selectError) {
      console.error('Error selecting routes:', selectError);
      return;
    }

    console.log('✅ Exchange rates for all routes:');
    routes.forEach(route => {
      console.log(`  ${route.origin_country} → ${route.destination_country}: ${route.exchange_rate}`);
    });

    console.log(`\n✅ Total routes: ${routes.length}`);
    console.log('✅ Exchange rate field is working!');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

verifyExchangeRate(); 