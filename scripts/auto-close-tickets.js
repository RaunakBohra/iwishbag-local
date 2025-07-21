#!/usr/bin/env node

/**
 * Auto-Close Resolved Tickets Script
 * Runs daily via GitHub Actions to automatically close resolved tickets after 7 days
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Auto-close resolved tickets that have been inactive for 7 days
 */
async function autoCloseResolvedTickets() {
  try {
    console.log('🤖 Starting auto-close process for resolved tickets...');
    console.log('⏰ Current time:', new Date().toISOString());
    
    // Find resolved tickets older than 7 days with no recent activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log('📅 Looking for resolved tickets older than:', sevenDaysAgo.toISOString());
    
    const { data: resolvedTickets, error: fetchError } = await supabase
      .from('support_tickets')
      .select('id, subject, user_id, updated_at')
      .eq('status', 'resolved')
      .lt('updated_at', sevenDaysAgo.toISOString());

    if (fetchError) {
      console.error('❌ Error fetching resolved tickets:', fetchError);
      throw new Error(`Failed to fetch resolved tickets: ${fetchError.message}`);
    }

    console.log(`📊 Found ${resolvedTickets?.length || 0} resolved tickets eligible for auto-closure`);

    if (!resolvedTickets || resolvedTickets.length === 0) {
      console.log('✅ No resolved tickets found for auto-closure');
      return { closedCount: 0, message: 'No resolved tickets found for auto-closure' };
    }

    // Log tickets that will be closed
    console.log('🎫 Tickets to be auto-closed:');
    resolvedTickets.forEach((ticket, index) => {
      console.log(`  ${index + 1}. ID: ${ticket.id.slice(0, 8)}... Subject: "${ticket.subject.slice(0, 50)}..." Last Updated: ${ticket.updated_at}`);
    });

    // Update tickets to closed status
    const ticketIds = resolvedTickets.map(ticket => ticket.id);
    const { error: updateError, count } = await supabase
      .from('support_tickets')
      .update({ 
        status: 'closed',
        updated_at: new Date().toISOString()
      })
      .in('id', ticketIds);

    if (updateError) {
      console.error('❌ Error updating tickets to closed:', updateError);
      throw new Error(`Failed to close tickets: ${updateError.message}`);
    }

    console.log(`✅ Successfully auto-closed ${resolvedTickets.length} resolved tickets`);
    console.log(`📈 Database rows affected: ${count}`);
    
    return { 
      closedCount: resolvedTickets.length, 
      message: `Successfully auto-closed ${resolvedTickets.length} resolved tickets` 
    };

  } catch (error) {
    console.error('❌ Auto-close process failed:', error);
    throw error;
  }
}

// Run the auto-close process
autoCloseResolvedTickets()
  .then((result) => {
    console.log('🎉 Auto-close process completed successfully');
    console.log('📊 Result:', result);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Auto-close process failed with error:', error.message);
    process.exit(1);
  });