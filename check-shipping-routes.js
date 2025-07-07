import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkAndUpdateShippingRoutes() {
  try {
    console.log('Checking existing shipping routes...');
    
    // First, let's see what routes exist
    const { data: routes, error: selectError } = await supabase
      .from('shipping_routes')
      .select('*')
      .limit(10);

    if (selectError) {
      console.error('Error selecting routes:', selectError);
      return;
    }

    console.log('✅ Found routes:');
    routes.forEach(route => {
      console.log(`  ${route.origin_country} → ${route.destination_country} (ID: ${route.id})`);
    });

    // Now let's try to add the exchange_rate column by updating a single route
    if (routes.length > 0) {
      const firstRoute = routes[0];
      console.log(`\nTrying to update route ${firstRoute.id} with exchange_rate...`);
      
      const { error: updateError } = await supabase
        .from('shipping_routes')
        .update({ exchange_rate: 1.0 })
        .eq('id', firstRoute.id);

      if (updateError) {
        console.error('Error updating route:', updateError);
        console.log('This suggests the exchange_rate column might not exist yet.');
        console.log('You may need to run the migration manually in your database.');
      } else {
        console.log('✅ Successfully updated route with exchange_rate');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAndUpdateShippingRoutes(); 