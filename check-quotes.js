import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuotes() {
  console.log('🔍 Checking available quotes...');
  
  // Get all quotes
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, display_id, origin_country, destination_country, costprice_total_usd')
    .limit(10);
    
  if (error) {
    console.error('❌ Error fetching quotes:', error);
    return;
  }
  
  console.log(`📋 Found ${quotes?.length || 0} quotes:`);
  quotes?.forEach((quote, index) => {
    console.log(`${index + 1}. ID: ${quote.id}`);
    console.log(`   Display ID: ${quote.display_id}`);
    console.log(`   Route: ${quote.origin_country} → ${quote.destination_country}`);
    console.log(`   Value: $${quote.costprice_total_usd}`);
    console.log('');
  });
  
  // Check for the specific quote ID with partial match
  const targetId = 'ed0d8962-1834-49e0-bff2-59bcc3c71937';
  const { data: specificQuote, error: specificError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', targetId);
    
  if (specificError) {
    console.error('❌ Error checking specific quote:', specificError);
  } else if (specificQuote && specificQuote.length > 0) {
    console.log('✅ Found the target quote!');
  } else {
    console.log('❌ Target quote not found in local database');
    console.log('💡 This might be production data. You may need to:');
    console.log('   1. Import the quote data from production');
    console.log('   2. Or connect to the production database instead');
  }
}

checkQuotes().catch(console.error);