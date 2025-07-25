/**
 * Script to check the quotes table structure and get sample data
 */

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import * as dotenv from 'dotenv';

const { Client } = pg;

// Load environment variables
dotenv.config();

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

// Direct database connection for advanced queries
const directDbClient = new Client({
  host: '127.0.0.1',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

async function checkQuotesStructure() {
  console.log('🔍 Checking Quotes Table Structure...\n');

  try {
    await directDbClient.connect();
    console.log('✅ Connected to database directly');

    // 1. Get full quotes table structure
    console.log('\n1. 📊 Complete quotes table structure...');
    const tableStructureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'quotes'
      ORDER BY ordinal_position;
    `;
    
    const tableStructure = await directDbClient.query(tableStructureQuery);
    console.log('✅ Quotes table columns:');
    tableStructure.rows.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
    });

    // 2. Check customer data structure
    console.log('\n2. 🧑‍💼 Checking customer data structure...');
    const customerDataQuery = `
      SELECT 
        id,
        display_id,
        customer_data,
        user_id,
        status,
        share_token,
        email_verified,
        verification_token,
        created_at
      FROM quotes 
      ORDER BY created_at DESC 
      LIMIT 3;
    `;
    
    const customerDataResult = await directDbClient.query(customerDataQuery);
    if (customerDataResult.rows.length > 0) {
      console.log('✅ Sample quote data:');
      customerDataResult.rows.forEach((quote, index) => {
        console.log(`\n   Quote ${index + 1}:`);
        console.log(`   🔹 ID: ${quote.id}`);
        console.log(`   🔹 Display ID: ${quote.display_id}`);
        console.log(`   🔹 Status: ${quote.status}`);
        console.log(`   🔹 User ID: ${quote.user_id || 'N/A'}`);
        console.log(`   🔹 Share Token: ${quote.share_token || 'N/A'}`);
        console.log(`   🔹 Email Verified: ${quote.email_verified || false}`);
        console.log(`   🔹 Verification Token: ${quote.verification_token || 'N/A'}`);
        console.log(`   🔹 Created: ${quote.created_at}`);
        
        if (quote.customer_data) {
          console.log(`   🔹 Customer Data: ${JSON.stringify(quote.customer_data, null, 2)}`);
        } else {
          console.log(`   🔹 Customer Data: N/A`);
        }
      });
    } else {
      console.log('ℹ️ No quotes found in the database');
    }

    // 3. Check for any quotes with share-related data
    console.log('\n3. 🔗 Checking for quotes with share-related data...');
    const shareDataQuery = `
      SELECT 
        COUNT(*) as total_quotes,
        COUNT(CASE WHEN share_token IS NOT NULL AND share_token != '' THEN 1 END) as quotes_with_share_token,
        COUNT(CASE WHEN verification_token IS NOT NULL AND verification_token != '' THEN 1 END) as quotes_with_verification_token,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as quotes_with_verified_email,
        COUNT(CASE WHEN customer_data IS NOT NULL THEN 1 END) as quotes_with_customer_data
      FROM quotes;
    `;
    
    const shareDataResult = await directDbClient.query(shareDataQuery);
    const stats = shareDataResult.rows[0];
    
    console.log('✅ Share-related statistics:');
    console.log(`   📋 Total quotes: ${stats.total_quotes}`);
    console.log(`   🔗 Quotes with share tokens: ${stats.quotes_with_share_token}`);
    console.log(`   ✉️ Quotes with verification tokens: ${stats.quotes_with_verification_token}`);
    console.log(`   ✅ Quotes with verified emails: ${stats.quotes_with_verified_email}`);
    console.log(`   📝 Quotes with customer data: ${stats.quotes_with_customer_data}`);

    // 4. Test share-related functions
    console.log('\n4. ⚙️ Testing share-related functions...');
    
    // Test generate_share_token function
    try {
      const shareTokenResult = await directDbClient.query('SELECT generate_share_token() as token;');
      console.log(`✅ generate_share_token() works: ${shareTokenResult.rows[0].token}`);
    } catch (error) {
      console.log(`❌ generate_share_token() failed: ${error.message}`);
    }
    
    // Test generate_verification_token function
    try {
      const verificationTokenResult = await directDbClient.query('SELECT generate_verification_token() as token;');
      console.log(`✅ generate_verification_token() works: ${verificationTokenResult.rows[0].token}`);
    } catch (error) {
      console.log(`❌ generate_verification_token() failed: ${error.message}`);
    }

    // 5. Test setting a share token on the first quote (if any exist)
    console.log('\n5. 🧪 Testing share token functionality...');
    
    const firstQuoteQuery = await directDbClient.query('SELECT id FROM quotes LIMIT 1;');
    if (firstQuoteQuery.rows.length > 0) {
      const quoteId = firstQuoteQuery.rows[0].id;
      console.log(`   Found quote to test with: ${quoteId}`);
      
      try {
        // Generate a share token for the first quote
        const setShareTokenResult = await directDbClient.query(
          'SELECT set_share_token($1) as token;',
          [quoteId]
        );
        console.log(`   ✅ Share token generated: ${setShareTokenResult.rows[0].token}`);
        
        // Verify it was set
        const verifyTokenQuery = await directDbClient.query(
          'SELECT share_token FROM quotes WHERE id = $1;',
          [quoteId]
        );
        console.log(`   ✅ Token verified in database: ${verifyTokenQuery.rows[0].share_token}`);
        
        // Test log_share_action function
        try {
          const logResult = await directDbClient.query(
            'SELECT log_share_action($1, $2, $3, $4, $5, $6) as log_id;',
            [
              quoteId,
              null, // user_id (can be null for anonymous access)
              'share_generated',
              '127.0.0.1',
              'Test User Agent',
              JSON.stringify({ test: true })
            ]
          );
          console.log(`   ✅ Share action logged: ${logResult.rows[0].log_id}`);
        } catch (logError) {
          console.log(`   ❌ Failed to log share action: ${logError.message}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Failed to set share token: ${error.message}`);
      }
    } else {
      console.log('   ℹ️ No quotes available for testing');
    }

    // 6. Check updated audit log
    console.log('\n6. 📝 Checking audit log after test...');
    const auditLogQuery = `
      SELECT 
        sal.action,
        sal.ip_address,
        sal.user_agent,
        sal.details,
        sal.created_at,
        q.display_id
      FROM share_audit_log sal
      LEFT JOIN quotes q ON sal.quote_id = q.id
      ORDER BY sal.created_at DESC 
      LIMIT 5;
    `;
    
    const auditLogResult = await directDbClient.query(auditLogQuery);
    if (auditLogResult.rows.length > 0) {
      console.log('✅ Audit log entries:');
      auditLogResult.rows.forEach((entry, index) => {
        console.log(`   ${index + 1}. ${entry.action} | Quote: ${entry.display_id || 'N/A'} | IP: ${entry.ip_address || 'N/A'}`);
        console.log(`      Time: ${entry.created_at} | Agent: ${entry.user_agent || 'N/A'}`);
        console.log(`      Details: ${entry.details ? JSON.stringify(entry.details) : 'None'}`);
      });
    } else {
      console.log('ℹ️ No audit log entries found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await directDbClient.end();
    console.log('\n🔌 Database connection closed');
  }

  console.log('\n✅ Quotes structure check complete!');
}

// Run the check
checkQuotesStructure().catch(console.error);