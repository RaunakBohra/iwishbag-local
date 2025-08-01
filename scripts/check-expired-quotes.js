#!/usr/bin/env node

/**
 * Quote Expiry Check Script for GitHub Actions
 * Marks expired quotes and performs daily maintenance
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkExpiredQuotes() {
  console.log('Checking for expired quotes...');
  
  // Get quotes that should be expired
  const { data: quotesToExpire, error: fetchError } = await supabase
    .from('quotes_v2')
    .select('id, quote_number, customer_email, expires_at')
    .not('expires_at', 'is', null)
    .lt('expires_at', new Date().toISOString())
    .in('status', ['sent', 'viewed'])
    .is('converted_to_order_id', null);

  if (fetchError) {
    throw fetchError;
  }

  console.log(`Found ${quotesToExpire?.length || 0} quotes to mark as expired`);

  // Update each quote to expired status
  const expiredQuotes = [];
  for (const quote of quotesToExpire || []) {
    try {
      const { error: updateError } = await supabase
        .from('quotes_v2')
        .update({ status: 'expired' })
        .eq('id', quote.id);

      if (updateError) {
        throw updateError;
      }

      expiredQuotes.push({
        id: quote.id,
        quote_number: quote.quote_number,
        customer_email: quote.customer_email,
        expired_at: quote.expires_at
      });

      console.log(`✅ Marked quote ${quote.quote_number || quote.id} as expired`);
    } catch (error) {
      console.error(`❌ Error updating quote ${quote.id}:`, error);
    }
  }

  return expiredQuotes;
}

async function getDailyStats() {
  console.log('\nGathering daily statistics...');
  
  const stats = {};

  // Total active quotes
  const { count: activeCount } = await supabase
    .from('active_quotes')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);
  
  stats.activeQuotes = activeCount || 0;

  // Quotes sent in last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: sentToday } = await supabase
    .from('quotes_v2')
    .select('*', { count: 'exact', head: true })
    .gte('sent_at', yesterday);
  
  stats.sentLast24Hours = sentToday || 0;

  // Quotes viewed in last 24 hours
  const { count: viewedToday } = await supabase
    .from('quotes_v2')
    .select('*', { count: 'exact', head: true })
    .gte('viewed_at', yesterday);
  
  stats.viewedLast24Hours = viewedToday || 0;

  // Quotes expiring in next 48 hours
  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const { count: expiringSoon } = await supabase
    .from('quotes_v2')
    .select('*', { count: 'exact', head: true })
    .lt('expires_at', twoDaysFromNow)
    .gt('expires_at', new Date().toISOString())
    .in('status', ['sent', 'viewed']);
  
  stats.expiringSoon = expiringSoon || 0;

  return stats;
}

async function main() {
  console.log('Starting daily quote maintenance...');
  console.log('Current time:', new Date().toISOString());
  
  const summary = {
    timestamp: new Date().toISOString(),
    expiredQuotes: [],
    stats: {},
    errors: []
  };

  try {
    // Run daily maintenance function
    const { data: maintenanceResult, error: maintenanceError } = await supabase
      .rpc('daily_quote_maintenance');

    if (maintenanceError) {
      console.warn('Maintenance function error:', maintenanceError);
    } else {
      console.log('Maintenance function result:', maintenanceResult);
    }

    // Check and mark expired quotes
    summary.expiredQuotes = await checkExpiredQuotes();
    
    // Get daily statistics
    summary.stats = await getDailyStats();

    // Log summary
    console.log('\n=== Daily Maintenance Summary ===');
    console.log(`Expired quotes marked: ${summary.expiredQuotes.length}`);
    console.log(`Active quotes: ${summary.stats.activeQuotes}`);
    console.log(`Sent in last 24h: ${summary.stats.sentLast24Hours}`);
    console.log(`Viewed in last 24h: ${summary.stats.viewedLast24Hours}`);
    console.log(`Expiring soon: ${summary.stats.expiringSoon}`);

    // Save summary for GitHub Actions
    fs.writeFileSync('expiry-summary.json', JSON.stringify(summary, null, 2));

  } catch (error) {
    console.error('Fatal error:', error);
    summary.errors.push({
      type: 'fatal',
      error: error.message
    });
    fs.writeFileSync('expiry-summary.json', JSON.stringify(summary, null, 2));
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);