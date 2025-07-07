import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function addExchangeRateField() {
  try {
    console.log('Adding exchange_rate field to shipping_routes table...');
    
    // Add the exchange_rate column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE shipping_routes 
        ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6) DEFAULT 1.0 CHECK (exchange_rate > 0);
      `
    });

    if (alterError) {
      console.error('Error adding exchange_rate column:', alterError);
      return;
    }

    console.log('✅ Exchange rate column added successfully');

    // Update existing routes with default exchange rates
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE shipping_routes SET exchange_rate = 83.0 WHERE origin_country = 'US' AND destination_country = 'IN';
        UPDATE shipping_routes SET exchange_rate = 1.0 WHERE origin_country = 'US' AND destination_country = 'CA';
        UPDATE shipping_routes SET exchange_rate = 0.8 WHERE origin_country = 'US' AND destination_country = 'UK';
        UPDATE shipping_routes SET exchange_rate = 1.5 WHERE origin_country = 'US' AND destination_country = 'AU';
        UPDATE shipping_routes SET exchange_rate = 0.9 WHERE origin_country = 'US' AND destination_country = 'DE';
        UPDATE shipping_routes SET exchange_rate = 0.9 WHERE origin_country = 'US' AND destination_country = 'FR';
        UPDATE shipping_routes SET exchange_rate = 150.0 WHERE origin_country = 'US' AND destination_country = 'JP';
        UPDATE shipping_routes SET exchange_rate = 5.0 WHERE origin_country = 'US' AND destination_country = 'BR';
        UPDATE shipping_routes SET exchange_rate = 18.0 WHERE origin_country = 'US' AND destination_country = 'MX';
        UPDATE shipping_routes SET exchange_rate = 1.35 WHERE origin_country = 'US' AND destination_country = 'SG';
        UPDATE shipping_routes SET exchange_rate = 1.0 WHERE exchange_rate IS NULL;
      `
    });

    if (updateError) {
      console.error('Error updating exchange rates:', updateError);
      return;
    }

    console.log('✅ Exchange rates updated for existing routes');

    // Verify the changes
    const { data: routes, error: selectError } = await supabase
      .from('shipping_routes')
      .select('origin_country, destination_country, exchange_rate')
      .limit(5);

    if (selectError) {
      console.error('Error selecting routes:', selectError);
      return;
    }

    console.log('✅ Sample routes with exchange rates:');
    routes.forEach(route => {
      console.log(`  ${route.origin_country} → ${route.destination_country}: ${route.exchange_rate}`);
    });

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addExchangeRateField(); 