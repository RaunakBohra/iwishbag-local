import { createClient } from '@supabase/supabase-js';

// Check both local and cloud databases
const localSupabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
);

const cloudSupabase = createClient(
  'https://grgvlrvywsfmnmkxrecd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTEzMTIsImV4cCI6MjA2NTk4NzMxMn0.IAE4zqmnd3MF4JaMJ4sl8QLHbrcSgCSd5hfN4DVDGHw',
);

async function debugStatusForDatabase(supabase, dbName) {
  console.log(`\n=== CHECKING ${dbName} DATABASE ===`);

  try {
    // Check status configuration
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .in('setting_key', ['quote_statuses', 'order_statuses']);

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return;
    }

    console.log(`Found ${settings?.length || 0} status settings`);

    // If no settings found, StatusConfigProvider should initialize defaults
    if (!settings || settings.length === 0) {
      console.log(
        'No status settings found in database. This means StatusConfigProvider should initialize defaults.',
      );
      console.log('Let me check if there are any quotes with payment_pending status...');
    }

    let paymentPendingInQuotes = false;
    let paymentPendingInOrders = false;

    settings?.forEach((setting) => {
      console.log(`\n--- ${setting.setting_key} ---`);
      try {
        const statuses = JSON.parse(setting.setting_value);
        const paymentPending = statuses.find((s) => s.name === 'payment_pending');

        if (paymentPending) {
          console.log(`payment_pending status found:`);
          console.log(`  showsInQuotesList: ${paymentPending.showsInQuotesList}`);
          console.log(`  showsInOrdersList: ${paymentPending.showsInOrdersList}`);

          if (setting.setting_key === 'quote_statuses' && paymentPending.showsInQuotesList) {
            paymentPendingInQuotes = true;
          }
          if (setting.setting_key === 'order_statuses' && paymentPending.showsInOrdersList) {
            paymentPendingInOrders = true;
          }
        } else {
          console.log(`payment_pending status NOT found in ${setting.setting_key}`);
        }
      } catch (e) {
        console.error(`Error parsing ${setting.setting_key}:`, e.message);
      }
    });

    console.log('\n=== SUMMARY ===');
    console.log(`payment_pending should show in quotes: ${paymentPendingInQuotes}`);
    console.log(`payment_pending should show in orders: ${paymentPendingInOrders}`);

    // Check actual quotes with payment_pending status
    console.log('\n=== CHECKING ACTUAL QUOTES ===');
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('id, display_id, status, product_name, email')
      .eq('status', 'payment_pending');

    // Also check for all quotes to see what statuses exist
    const { data: allQuotes, error: allQuotesError } = await supabase
      .from('quotes')
      .select('status')
      .limit(20);

    if (allQuotes) {
      const uniqueStatuses = [...new Set(allQuotes.map((q) => q.status))];
      console.log('All unique statuses found in quotes table:', uniqueStatuses);
    }

    if (quotesError) {
      console.error('Error fetching quotes:', quotesError);
      return;
    }

    console.log(`Found ${quotes?.length || 0} quotes with payment_pending status:`);
    quotes?.forEach((quote) => {
      console.log(`  - ${quote.display_id}: ${quote.product_name} (${quote.email})`);
    });

    // Test the filtering logic from useQuoteManagement
    console.log('\n=== TESTING QUOTE FILTERING LOGIC ===');

    // Simulate getStatusesForQuotesList
    const quoteSettings = settings?.find((s) => s.setting_key === 'quote_statuses');
    if (quoteSettings) {
      const quoteStatuses = JSON.parse(quoteSettings.setting_value);
      const allowedInQuotes = quoteStatuses.filter((s) => s.showsInQuotesList).map((s) => s.name);

      console.log('Statuses allowed in quotes list:', allowedInQuotes);
      console.log(
        'Does payment_pending appear in allowed list?',
        allowedInQuotes.includes('payment_pending'),
      );
    }

    // Test the filtering logic from useOrderManagement
    console.log('\n=== TESTING ORDER FILTERING LOGIC ===');

    const orderSettings = settings?.find((s) => s.setting_key === 'order_statuses');
    if (orderSettings) {
      const orderStatuses = JSON.parse(orderSettings.setting_value);
      const allowedInOrders = orderStatuses.filter((s) => s.showsInOrdersList).map((s) => s.name);

      console.log('Statuses allowed in orders list:', allowedInOrders);
      console.log(
        'Does payment_pending appear in allowed list?',
        allowedInOrders.includes('payment_pending'),
      );
    }
  } catch (error) {
    console.error(`${dbName} debug error:`, error);
  }
}

async function debugBothDatabases() {
  await debugStatusForDatabase(localSupabase, 'LOCAL');
  await debugStatusForDatabase(cloudSupabase, 'CLOUD');
}

debugBothDatabases();
