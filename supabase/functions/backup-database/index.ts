import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  authenticateUser,
  requireAdmin,
  AuthError,
  createAuthErrorResponse,
  validateMethod,
} from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'https://iwishbag.com',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate request method
    validateMethod(req, ['POST']);

    // Authenticate user and require admin access
    const { user, supabaseClient } = await authenticateUser(req);
    await requireAdmin(supabaseClient, user.id);

    console.log(`🔐 Admin user ${user.email} initiated database backup`);

    // Create service role client for backup operations
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('🔄 Starting database backup...');

    // Create backup tables
    const backupQueries = [
      // Backup payment gateways
      `DROP TABLE IF EXISTS payment_gateways_pre_paypal`,
      `CREATE TABLE payment_gateways_pre_paypal AS SELECT * FROM payment_gateways`,

      // Backup country settings
      `DROP TABLE IF EXISTS country_settings_pre_paypal`,
      `CREATE TABLE country_settings_pre_paypal AS SELECT * FROM country_settings`,

      // Backup profiles (payment columns only)
      `DROP TABLE IF EXISTS profiles_payment_pre_paypal`,
      `CREATE TABLE profiles_payment_pre_paypal AS 
       SELECT id, preferred_display_currency, cod_enabled, country FROM profiles`,

      // Backup country payment preferences
      `DROP TABLE IF EXISTS country_payment_preferences_pre_paypal`,
      `CREATE TABLE country_payment_preferences_pre_paypal AS 
       SELECT * FROM country_payment_preferences`,
    ];

    // Execute backup queries
    for (const query of backupQueries) {
      console.log(`📝 Executing: ${query.substring(0, 50)}...`);
      const { error } = await supabaseServiceClient.rpc('exec_sql', {
        sql_query: query,
      });
      if (error) {
        console.error(`❌ Error in backup query: ${error.message}`);
        throw error;
      }
    }

    // Verify backups were created
    const verificationQueries = [
      'SELECT COUNT(*) as count FROM payment_gateways_pre_paypal',
      'SELECT COUNT(*) as count FROM country_settings_pre_paypal',
      'SELECT COUNT(*) as count FROM profiles_payment_pre_paypal',
      'SELECT COUNT(*) as count FROM country_payment_preferences_pre_paypal',
    ];

    const backupSizes = [];
    for (const query of verificationQueries) {
      const { data, error } = await supabaseServiceClient.rpc('exec_sql', {
        sql_query: query,
      });
      if (error) {
        console.error(`❌ Error verifying backup: ${error.message}`);
      } else {
        backupSizes.push(data?.[0]?.count || 0);
      }
    }

    console.log('✅ Backup completed successfully');
    console.log('📊 Backup sizes:', {
      payment_gateways: backupSizes[0],
      country_settings: backupSizes[1],
      profiles: backupSizes[2],
      country_payment_preferences: backupSizes[3],
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Database backup completed successfully',
        backup_info: {
          timestamp: new Date().toISOString(),
          tables_backed_up: [
            'payment_gateways_pre_paypal',
            'country_settings_pre_paypal',
            'profiles_payment_pre_paypal',
            'country_payment_preferences_pre_paypal',
          ],
          record_counts: {
            payment_gateways: backupSizes[0],
            country_settings: backupSizes[1],
            profiles: backupSizes[2],
            country_payment_preferences: backupSizes[3],
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('❌ Backup failed:', error);

    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'Database backup failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
