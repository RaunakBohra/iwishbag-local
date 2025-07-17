import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Database } from '../../../src/integrations/supabase/types.ts'; // Fixed path from supabase/functions/update-exchange-rates/
import {
  authenticateUser,
  requireAdmin,
  AuthError,
  createAuthErrorResponse,
  validateMethod,
} from '../_shared/auth.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

const EXCHANGERATE_API_BASE_URL = 'https://v6.exchangerate-api.com/v6/';

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🔵 === UPDATE EXCHANGE RATES FUNCTION STARTED === ');
  const startTime = Date.now();

  try {
    // Validate request method
    validateMethod(req, ['POST']);

    // Authenticate and require admin access
    // Authenticate user
    const { user, supabaseClient } = await authenticateUser(req);

    // Require admin access
    await requireAdmin(supabaseClient, user.id);

    console.log(`🔐 Admin user ${user.email} updating exchange rates`);

    // Initialize Supabase Admin client (service role key bypasses RLS)
    const supabaseAdmin: SupabaseClient<Database> = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get API Key from environment variables
    const apiKey = Deno.env.get('EXCHANGERATE_API_KEY');
    if (!apiKey) {
      console.error('❌ EXCHANGERATE_API_KEY not configured.');
      return createErrorResponse('Exchange Rate API key not configured.', 500, corsHeaders);
    }

    // Fetch latest exchange rates with USD as base
    console.log('🔵 Fetching latest exchange rates from ExchangeRate-API...');
    const response = await fetch(`${EXCHANGERATE_API_BASE_URL}${apiKey}/latest/USD`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Failed to fetch exchange rates:  ${response.status} - ${errorText}`);
      return createErrorResponse(
        `Failed to fetch exchange rates: ${response.statusText}`,
        500,
        corsHeaders,
      );
    }

    const data = await response.json();
    if (data.result !== 'success') {
      console.error('❌ Exchange Rate API returned an error:', data);
      return createErrorResponse(`Exchange Rate API error: ${data.result}`, 500, corsHeaders);
    }

    const rates: Record<string, number> = data.conversion_rates;
    console.log(`✅ Fetched rates for  ${Object.keys(rates).length} currencies.`);

    // Fetch all country settings to update their rates
    console.log('🔵 Fetching all country settings...');
    const { data: countrySettings, error: fetchError } = await supabaseAdmin
      .from('country_settings')
      .select('code, currency, rate_from_usd, name');

    if (fetchError) {
      console.error('❌ Error fetching country settings:', fetchError);
      return createErrorResponse('Failed to fetch country settings.', 500, corsHeaders);
    }

    if (!countrySettings || countrySettings.length === 0) {
      console.warn('⚠️ No country settings found to update.');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No country settings found to update.',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Prepare updates for country_settings
    const updates = countrySettings
      .map((setting) => {
        const currencyCode = setting.currency;
        let rate = rates[currencyCode]; // Rate from USD to this currency

        if (rate) {
          // Apply specific adjustments based on country code
          if (setting.code === 'NP') {
            rate += 2; // Add 2 for Nepal
          } else if (setting.code === 'IN') {
            rate += 3; // Add 3 for India
          }
          // For other countries, 'rate' remains the fetched rate

          // Round to 2 decimal places
          const roundedRate = parseFloat(rate.toFixed(2));

          return {
            code: setting.code,
            name: setting.name,
            currency: setting.currency,
            rate_from_usd: roundedRate,
          };
        }
        console.warn(
          `⚠️ No exchange rate found for currency: ${currencyCode} (Country: ${setting.code})`,
        );
        return null; // Skip if no rate found
      })
      .filter(Boolean); // Remove null entries

    if (updates.length > 0) {
      console.log(`🔵 Updating ${updates.length} country settings with new rates...`);
      console.log('🔵 Updates payload:', JSON.stringify(updates, null, 2));
      const { error: updateError } = await supabaseAdmin
        .from('country_settings')
        .upsert(updates, { onConflict: 'code' }); // Upsert based on country code

      if (updateError) {
        console.error('❌ Error updating country settings:', updateError);
        return createErrorResponse('Failed to update country settings.', 500, corsHeaders);
      }
      console.log('✅ Country settings updated successfully.');
    } else {
      console.log('⚠️ No country settings were updated (no matching currencies found).');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Exchange rates updated successfully in  ${processingTime}ms.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Exchange rates updated successfully.',
        updated_count: updates.length,
        processing_time_ms: processingTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Top-level error in update-exchange-rates:', error);

    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }

    return createErrorResponse(`Internal server error: ${errorMessage}`, 500, corsHeaders);
  }
});

function createErrorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: message,
    }),
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}
