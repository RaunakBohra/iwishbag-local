import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://htycplcuyoqfukhrughf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0eWNwbGN1eW9xZnVraHJ1Z2hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzQsImV4cCI6MjA1MDU0ODk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSendEmail() {
  try {
    console.log('Testing send-email function...');
    
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: 'test@example.com',
        template: 'quote_confirmation',
        data: {
          quoteId: 'TEST-123',
          itemCount: 1,
          estimatedTime: '24-48 hours',
          dashboardUrl: 'https://example.com/dashboard'
        }
      }
    });

    if (error) {
      console.error('Error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('Success:', data);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

testSendEmail(); 