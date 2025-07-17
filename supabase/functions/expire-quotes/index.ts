import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import {
  authenticateUser,
  requireAdmin,
  AuthError,
  createAuthErrorResponse,
  validateMethod,
} from '../_shared/auth.ts';

interface StatusConfig {
  name: string;
  autoExpireHours?: number;
}

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

    console.log(`🔐 Admin user ${user.email} initiated quote expiration`);

    // Use environment variables for security
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const client = createClient(supabaseUrl, supabaseServiceRoleKey);

    // First, get the status configurations to understand which statuses should auto-expire
    const { data: statusSettings, error: statusError } = await client
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'quote_statuses')
      .single();

    if (statusError) {
      console.error('❌ Error fetching status settings:', statusError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to fetch status configurations',
          expiredQuotes: 0,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Parse status configurations
    const statusConfigs: StatusConfig[] = JSON.parse(statusSettings.setting_value);
    const statusesWithAutoExpire = statusConfigs.filter(
      (status: StatusConfig) => status.autoExpireHours && status.autoExpireHours > 0,
    );

    console.log(
      `📋 Found ${statusesWithAutoExpire.length} statuses with auto-expire configuration:`,
    );
    statusesWithAutoExpire.forEach((status: StatusConfig) => {
      console.log(`  - ${status.name}: ${status.autoExpireHours} hours`);
    });

    // Expire quotes based on their status-specific expiration times
    let totalExpired = 0;
    const expiredQuotes = [];

    for (const statusConfig of statusesWithAutoExpire) {
      const statusName = statusConfig.name;
      const autoExpireHours = statusConfig.autoExpireHours;

      // Calculate the expiration threshold for this status
      const expirationThreshold = new Date(Date.now() - autoExpireHours * 60 * 60 * 1000);

      // Find and expire quotes for this status
      const { data: quotesToExpire, error: expireError } = await client
        .from('quotes')
        .select('id, display_id, email, final_total, sent_at, expires_at')
        .eq('status', statusName)
        .lt('expires_at', expirationThreshold.toISOString());

      if (expireError) {
        console.error(`❌ Error finding quotes to expire for status '${statusName}':`, expireError);
        continue;
      }

      if (quotesToExpire && quotesToExpire.length > 0) {
        // Update these quotes to expired status
        const { error: updateError } = await client
          .from('quotes')
          .update({ status: 'expired' })
          .in(
            'id',
            quotesToExpire.map((q) => q.id),
          );

        if (updateError) {
          console.error(`❌ Error expiring quotes for status '${statusName}':`, updateError);
        } else {
          console.log(`✅ Expired ${quotesToExpire.length} quotes with status '${statusName}'`);
          totalExpired += quotesToExpire.length;
          expiredQuotes.push(...quotesToExpire);
        }
      }
    }

    console.log(`✅ Successfully expired ${totalExpired} quotes total`);

    // Log recently expired quotes
    if (expiredQuotes.length > 0) {
      console.log('📋 Recently expired quotes:');
      expiredQuotes.forEach((quote) => {
        console.log(`  - ${quote.display_id || quote.id} (${quote.email}) - $${quote.final_total}`);
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        expiredQuotes: totalExpired,
        timestamp: new Date().toISOString(),
        message: `Successfully expired ${totalExpired} quotes`,
        statusConfigs: statusesWithAutoExpire.map((s: StatusConfig) => ({
          name: s.name,
          autoExpireHours: s.autoExpireHours,
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);

    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        expiredQuotes: 0,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
