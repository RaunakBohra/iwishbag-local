/**
 * Script to check the share-related functions and their signatures
 */

import pg from 'pg';
import * as dotenv from 'dotenv';

const { Client } = pg;

// Load environment variables
dotenv.config();

// Direct database connection for advanced queries
const directDbClient = new Client({
  host: '127.0.0.1',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

async function checkShareFunctions() {
  console.log('🔍 Checking Share Functions...\n');

  try {
    await directDbClient.connect();
    console.log('✅ Connected to database directly');

    // 1. Get all share-related functions with their signatures
    console.log('\n1. 📊 Share-related functions with signatures...');
    const functionsQuery = `
      SELECT 
        routine_name,
        routine_type,
        data_type AS return_type,
        routine_definition,
        parameter_types,
        parameter_names,
        parameter_modes
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND (
        routine_name LIKE '%share%' OR 
        routine_name LIKE '%verif%' OR 
        routine_name LIKE '%log_share%' OR
        routine_name = 'generate_verification_token' OR
        routine_name = 'generate_share_token'
      )
      ORDER BY routine_name;
    `;
    
    const functionsResult = await directDbClient.query(functionsQuery);
    console.log('✅ Share-related functions found:');
    functionsResult.rows.forEach((func, index) => {
      console.log(`\n  ${index + 1}. ${func.routine_name} (${func.routine_type})`);
      console.log(`     Return Type: ${func.return_type || 'N/A'}`);
      if (func.parameter_types) {
        console.log(`     Parameters: ${func.parameter_types}`);
      }
      if (func.routine_definition && func.routine_definition.length < 500) {
        console.log(`     Definition Preview: ${func.routine_definition.substring(0, 200)}...`);
      }
    });

    // 2. Check if set_share_token function exists
    console.log('\n2. 🔧 Checking set_share_token function specifically...');
    const setShareTokenQuery = `
      SELECT 
        routine_name,
        routine_definition,
        external_name,
        specific_name
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'set_share_token';
    `;
    
    const setShareTokenResult = await directDbClient.query(setShareTokenQuery);
    if (setShareTokenResult.rows.length > 0) {
      console.log('✅ set_share_token function found:');
      console.log(setShareTokenResult.rows[0]);
    } else {
      console.log('❌ set_share_token function NOT found');
      
      // Let's create the function
      console.log('\n   Creating set_share_token function...');
      const createFunctionQuery = `
        CREATE OR REPLACE FUNCTION set_share_token(p_quote_id UUID)
        RETURNS TEXT AS $$
        DECLARE
            new_token TEXT;
        BEGIN
            -- Generate new share token
            SELECT generate_share_token() INTO new_token;
            
            -- Update quote with share token
            UPDATE quotes 
            SET share_token = new_token
            WHERE id = p_quote_id;
            
            RETURN new_token;
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      try {
        await directDbClient.query(createFunctionQuery);
        console.log('   ✅ set_share_token function created successfully');
      } catch (error) {
        console.log(`   ❌ Failed to create function: ${error.message}`);
      }
    }

    // 3. Test setting a share token now
    console.log('\n3. 🧪 Testing share token functionality (attempt 2)...');
    
    const firstQuoteQuery = await directDbClient.query('SELECT id, display_id FROM quotes LIMIT 1;');
    if (firstQuoteQuery.rows.length > 0) {
      const quote = firstQuoteQuery.rows[0];
      console.log(`   Testing with quote: ${quote.id} (Display ID: ${quote.display_id || 'N/A'})`);
      
      try {
        // Generate a share token for the first quote
        const setShareTokenResult = await directDbClient.query(
          'SELECT set_share_token($1) as token;',
          [quote.id]
        );
        console.log(`   ✅ Share token generated: ${setShareTokenResult.rows[0].token}`);
        
        // Verify it was set
        const verifyTokenQuery = await directDbClient.query(
          'SELECT share_token FROM quotes WHERE id = $1;',
          [quote.id]
        );
        console.log(`   ✅ Token verified in database: ${verifyTokenQuery.rows[0].share_token}`);
        
        // Test log_share_action function
        try {
          const logResult = await directDbClient.query(
            'SELECT log_share_action($1, $2, $3, $4, $5, $6) as log_id;',
            [
              quote.id,
              null, // user_id (can be null for anonymous access)
              'share_generated',
              '127.0.0.1',
              'Database Test Script',
              JSON.stringify({ 
                test: true, 
                generated_at: new Date().toISOString(),
                quote_display_id: quote.display_id 
              })
            ]
          );
          console.log(`   ✅ Share action logged: ${logResult.rows[0].log_id}`);
        } catch (logError) {
          console.log(`   ❌ Failed to log share action: ${logError.message}`);
        }
        
        // Test accessing the quote by share token
        const accessByTokenQuery = await directDbClient.query(
          'SELECT id, display_id, status, share_token FROM quotes WHERE share_token = $1;',
          [setShareTokenResult.rows[0].token]
        );
        
        if (accessByTokenQuery.rows.length > 0) {
          console.log(`   ✅ Quote accessible by share token: ${accessByTokenQuery.rows[0].id}`);
        } else {
          console.log(`   ❌ Could not access quote by share token`);
        }
        
      } catch (error) {
        console.log(`   ❌ Failed to set share token: ${error.message}`);
      }
    } else {
      console.log('   ℹ️ No quotes available for testing');
    }

    // 4. Check updated audit log
    console.log('\n4. 📝 Checking audit log after test...');
    const auditLogQuery = `
      SELECT 
        sal.*,
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
        console.log(`\n   ${index + 1}. Action: ${entry.action}`);
        console.log(`      Quote: ${entry.display_id || entry.quote_id}`);
        console.log(`      User ID: ${entry.user_id || 'Anonymous'}`);
        console.log(`      IP: ${entry.ip_address || 'N/A'}`);
        console.log(`      User Agent: ${entry.user_agent || 'N/A'}`);
        console.log(`      Time: ${entry.created_at}`);
        console.log(`      Details: ${entry.details ? JSON.stringify(entry.details, null, 2) : 'None'}`);
      });
    } else {
      console.log('ℹ️ No audit log entries found');
    }

    // 5. Test email verification functions
    console.log('\n5. ✉️ Testing email verification functions...');
    
    const testQuoteQuery = await directDbClient.query('SELECT id FROM quotes WHERE share_token IS NOT NULL LIMIT 1;');
    if (testQuoteQuery.rows.length > 0) {
      const quoteId = testQuoteQuery.rows[0].id;
      const testEmail = 'test@example.com';
      
      try {
        // Test initiate_quote_email_verification
        const verificationResult = await directDbClient.query(
          'SELECT initiate_quote_email_verification($1, $2) as token;',
          [quoteId, testEmail]
        );
        console.log(`   ✅ Email verification initiated: ${verificationResult.rows[0].token}`);
        
        // Check the quote was updated
        const updatedQuoteQuery = await directDbClient.query(
          'SELECT verification_token, verification_sent_at, verification_expires_at FROM quotes WHERE id = $1;',
          [quoteId]
        );
        
        const updatedQuote = updatedQuoteQuery.rows[0];
        console.log(`   ✅ Quote updated with verification details:`);
        console.log(`      Token: ${updatedQuote.verification_token ? 'Set' : 'Not set'}`);
        console.log(`      Sent at: ${updatedQuote.verification_sent_at}`);
        console.log(`      Expires at: ${updatedQuote.verification_expires_at}`);
        
      } catch (error) {
        console.log(`   ❌ Failed to test email verification: ${error.message}`);
      }
    } else {
      console.log('   ℹ️ No quotes with share tokens available for email verification test');
    }

    // 6. Final summary
    console.log('\n6. 📊 Final Summary...');
    const finalStatsQuery = `
      SELECT 
        COUNT(*) as total_quotes,
        COUNT(CASE WHEN share_token IS NOT NULL AND share_token != '' THEN 1 END) as quotes_with_share_token,
        COUNT(CASE WHEN verification_token IS NOT NULL AND verification_token != '' THEN 1 END) as quotes_with_verification_token,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as quotes_with_verified_email
      FROM quotes;
    `;
    
    const finalStatsResult = await directDbClient.query(finalStatsQuery);
    const finalStats = finalStatsResult.rows[0];
    
    console.log('✅ Final statistics:');
    console.log(`   📋 Total quotes: ${finalStats.total_quotes}`);
    console.log(`   🔗 Quotes with share tokens: ${finalStats.quotes_with_share_token}`);
    console.log(`   ✉️ Quotes with verification tokens: ${finalStats.quotes_with_verification_token}`);
    console.log(`   ✅ Quotes with verified emails: ${finalStats.quotes_with_verified_email}`);

    const auditCountQuery = await directDbClient.query('SELECT COUNT(*) as count FROM share_audit_log;');
    console.log(`   📝 Total audit log entries: ${auditCountQuery.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await directDbClient.end();
    console.log('\n🔌 Database connection closed');
  }

  console.log('\n✅ Share functions check complete!');
}

// Run the check
checkShareFunctions().catch(console.error);