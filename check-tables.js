// Simple script to check available tables
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

async function checkTables() {
  try {
    // Try unified_quotes first
    const { data: quote1, error: error1 } = await supabase
      .from('unified_quotes')
      .select('id')
      .limit(1);
    
    if (!error1) {
      console.log('Found unified_quotes table');
    } else {
      console.log('unified_quotes error:', error1.message);
    }

    // Try quotes
    const { data: quote2, error: error2 } = await supabase
      .from('quotes')
      .select('id')
      .limit(1);
    
    if (!error2) {
      console.log('Found quotes table');
    } else {
      console.log('quotes error:', error2.message);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();