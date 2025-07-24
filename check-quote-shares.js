/**
 * Comprehensive script to check existing quote sharing data
 * This script queries the database for existing quotes with share tokens and audit log entries
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

async function checkQuoteShares() {
  console.log('🔍 Checking Quote Sharing Data...\n');

  try {
    // Connect to direct database
    await directDbClient.connect();
    console.log('✅ Connected to database directly');

    // 1. Check quotes table structure for share-related columns
    console.log('\n1. 📊 Checking quotes table structure for share fields...');
    const shareColumnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'quotes'
      AND column_name LIKE '%share%' OR column_name LIKE '%token%' OR column_name LIKE '%verif%';
    `;
    
    const shareColumns = await directDbClient.query(shareColumnsQuery);
    if (shareColumns.rows.length > 0) {
      console.log('✅ Share-related columns found:');
      shareColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
      });
    } else {
      console.log('❌ No share-related columns found in quotes table');
    }

    // 2. Check if share_audit_log table exists
    console.log('\n2. 🗃️ Checking share_audit_log table...');
    const auditTableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'share_audit_log';
    `;
    
    const auditTable = await directDbClient.query(auditTableQuery);
    if (auditTable.rows.length > 0) {
      console.log('✅ share_audit_log table exists');
      
      // Get table structure
      const auditStructureQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'share_audit_log'
        ORDER BY ordinal_position;
      `;
      
      const auditStructure = await directDbClient.query(auditStructureQuery);
      console.log('   Table structure:');
      auditStructure.rows.forEach(col => {
        console.log(`     - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('❌ share_audit_log table does not exist');
    }

    // 3. Count quotes with share tokens
    console.log('\n3. 📈 Checking quotes with share tokens...');
    try {
      const shareTokenQuery = `
        SELECT 
          COUNT(*) as total_quotes,
          COUNT(CASE WHEN share_token IS NOT NULL THEN 1 END) as quotes_with_share_token,
          COUNT(CASE WHEN verification_token IS NOT NULL THEN 1 END) as quotes_with_verification_token,
          COUNT(CASE WHEN email_verified = true THEN 1 END) as quotes_with_verified_email
        FROM quotes;
      `;
      
      const shareTokenResult = await directDbClient.query(shareTokenQuery);
      const stats = shareTokenResult.rows[0];
      
      console.log('✅ Quote statistics:');
      console.log(`   📋 Total quotes: ${stats.total_quotes}`);
      console.log(`   🔗 Quotes with share tokens: ${stats.quotes_with_share_token}`);
      console.log(`   ✉️ Quotes with verification tokens: ${stats.quotes_with_verification_token || 0}`);
      console.log(`   ✅ Quotes with verified emails: ${stats.quotes_with_verified_email || 0}`);
    } catch (error) {
      console.log('❌ Error checking share token statistics:', error.message);
    }

    // 4. Get sample quotes with share tokens
    console.log('\n4. 📋 Sample quotes with share tokens...');
    try {
      const sampleQuery = `
        SELECT 
          id,
          display_id,
          share_token,
          customer_email,
          email_verified,
          status,
          created_at,
          view_count,
          total_view_duration
        FROM quotes 
        WHERE share_token IS NOT NULL 
        ORDER BY created_at DESC 
        LIMIT 5;
      `;
      
      const sampleResult = await directDbClient.query(sampleQuery);
      if (sampleResult.rows.length > 0) {
        console.log('✅ Sample quotes with share tokens:');
        sampleResult.rows.forEach(quote => {
          console.log(`   🔹 ${quote.display_id} | Status: ${quote.status} | Email: ${quote.customer_email || 'N/A'}`);
          console.log(`     Token: ${quote.share_token?.substring(0, 10)}... | Views: ${quote.view_count || 0} | Duration: ${quote.total_view_duration || 0}s`);
        });
      } else {
        console.log('ℹ️ No quotes with share tokens found');
      }
    } catch (error) {
      console.log('❌ Error fetching sample quotes:', error.message);
    }

    // 5. Check share audit log entries
    console.log('\n5. 📝 Checking share audit log entries...');
    try {
      const auditLogQuery = `
        SELECT 
          COUNT(*) as total_entries,
          action,
          COUNT(*) as action_count
        FROM share_audit_log 
        GROUP BY action
        ORDER BY action_count DESC;
      `;
      
      const auditLogResult = await directDbClient.query(auditLogQuery);
      if (auditLogResult.rows.length > 0) {
        console.log('✅ Audit log statistics by action:');
        auditLogResult.rows.forEach(entry => {
          console.log(`   📊 ${entry.action}: ${entry.action_count} entries`);
        });
      } else {
        console.log('ℹ️ No entries found in share_audit_log');
      }
    } catch (error) {
      console.log('❌ Error checking audit log (table might not exist):', error.message);
    }

    // 6. Get recent share audit log entries
    console.log('\n6. 🕒 Recent share audit log entries...');
    try {
      const recentAuditQuery = `
        SELECT 
          sal.action,
          sal.ip_address,
          sal.created_at,
          q.display_id,
          sal.details
        FROM share_audit_log sal
        LEFT JOIN quotes q ON sal.quote_id = q.id
        ORDER BY sal.created_at DESC 
        LIMIT 10;
      `;
      
      const recentAuditResult = await directDbClient.query(recentAuditQuery);
      if (recentAuditResult.rows.length > 0) {
        console.log('✅ Recent audit log entries:');
        recentAuditResult.rows.forEach(entry => {
          console.log(`   🔹 ${entry.action} | Quote: ${entry.display_id || 'N/A'} | IP: ${entry.ip_address || 'N/A'}`);
          console.log(`     Time: ${entry.created_at} | Details: ${entry.details ? JSON.stringify(entry.details) : 'None'}`);
        });
      } else {
        console.log('ℹ️ No recent audit log entries found');
      }
    } catch (error) {
      console.log('❌ Error fetching recent audit entries:', error.message);
    }

    // 7. Check share-related functions
    console.log('\n7. ⚙️ Checking share-related database functions...');
    try {
      const functionsQuery = `
        SELECT routine_name, routine_type 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name LIKE '%share%' OR routine_name LIKE '%verif%' OR routine_name LIKE '%log_share%';
      `;
      
      const functionsResult = await directDbClient.query(functionsQuery);
      if (functionsResult.rows.length > 0) {
        console.log('✅ Share-related functions found:');
        functionsResult.rows.forEach(func => {
          console.log(`   🔧 ${func.routine_name} (${func.routine_type})`);
        });
      } else {
        console.log('ℹ️ No share-related functions found');
      }
    } catch (error) {
      console.log('❌ Error checking functions:', error.message);
    }

    // 8. Test using Supabase client (RLS aware)
    console.log('\n8. 🔐 Testing Supabase client queries (with RLS)...');
    try {
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('id, display_id, share_token, customer_email, status')
        .not('share_token', 'is', null)
        .limit(3);

      if (quotesError) {
        console.log('❌ Supabase quotes query error:', quotesError.message);
      } else {
        console.log(`✅ Supabase found ${quotesData.length} quotes with share tokens`);
        if (quotesData.length > 0) {
          quotesData.forEach(quote => {
            console.log(`   🔹 ${quote.display_id} | Status: ${quote.status} | Has Token: ✅`);
          });
        }
      }
    } catch (error) {
      console.log('❌ Error with Supabase client query:', error.message);
    }

    // 9. Test audit log via Supabase client
    console.log('\n9. 📊 Testing audit log via Supabase client...');
    try {
      const { data: auditData, error: auditError } = await supabase
        .from('share_audit_log')
        .select('action, created_at, quote_id')
        .order('created_at', { ascending: false })
        .limit(5);

      if (auditError) {
        console.log('❌ Supabase audit log query error:', auditError.message);
      } else {
        console.log(`✅ Supabase found ${auditData.length} audit log entries`);
        if (auditData.length > 0) {
          auditData.forEach(entry => {
            console.log(`   📝 ${entry.action} | ${entry.created_at} | Quote ID: ${entry.quote_id}`);
          });
        }
      }
    } catch (error) {
      console.log('❌ Error with Supabase audit log query:', error.message);
    }

  } catch (error) {
    console.error('❌ Connection or query failed:', error.message);
  } finally {
    await directDbClient.end();
    console.log('\n🔌 Database connection closed');
  }

  console.log('\n✅ Quote sharing data check complete!');
}

// Run the check
checkQuoteShares().catch(console.error);