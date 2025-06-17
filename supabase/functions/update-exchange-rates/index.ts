
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const exchangeRateApiKey = Deno.env.get("EXCHANGE_RATE_API_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExchangeRateResponse {
  rates: Record<string, number>;
  base: string;
  date?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting exchange rate update...");

    // Check if auto updates are enabled
    const { data: autoUpdateSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'auto_exchange_rate_enabled')
      .single();

    if (autoUpdateSetting?.setting_value !== 'true') {
      console.log("Auto exchange rate updates are disabled");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Auto exchange rate updates are disabled",
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Fetch current exchange rates from ExchangeRate-API.com
    const apiUrl = exchangeRateApiKey 
      ? `https://v6.exchangerate-api.com/v6/${exchangeRateApiKey}/latest/USD`
      : "https://api.exchangerate-api.com/v4/latest/USD";

    console.log("Fetching from API:", apiUrl.includes('v6') ? 'Premium API' : 'Free API');
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status} - ${response.statusText}`);
    }

    const data: ExchangeRateResponse = await response.json();
    console.log("Fetched exchange rates for", Object.keys(data.rates).length, "currencies");

    // Get all countries from our database
    const { data: countries, error: fetchError } = await supabase
      .from('country_settings')
      .select('code, currency, name');

    if (fetchError) {
      throw new Error(`Database fetch error: ${fetchError.message}`);
    }

    // Track update statistics
    let successCount = 0;
    let failureCount = 0;
    const failedUpdates: string[] = [];

    // Update rates for each country
    for (const country of countries || []) {
      if (country.currency && data.rates[country.currency]) {
        const rate = data.rates[country.currency];
        
        const { error: updateError } = await supabase
          .from('country_settings')
          .update({ 
            rate_from_usd: rate,
            updated_at: new Date().toISOString()
          })
          .eq('code', country.code);

        if (updateError) {
          console.error(`Failed to update ${country.code}:`, updateError);
          failureCount++;
          failedUpdates.push(`${country.name} (${country.code})`);
        } else {
          successCount++;
          console.log(`Updated ${country.code}: 1 USD = ${rate} ${country.currency}`);
        }
      } else {
        failureCount++;
        failedUpdates.push(`${country.name} (${country.code}) - Currency ${country.currency} not found in API`);
      }
    }

    // Log the update to system for audit trail
    await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'last_exchange_rate_update',
        setting_value: new Date().toISOString(),
        description: `Updated ${successCount} rates, ${failureCount} failures`
      });

    console.log(`Exchange rates update completed: ${successCount} success, ${failureCount} failures`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${successCount} exchange rates successfully`,
        details: {
          successCount,
          failureCount,
          failedUpdates: failedUpdates.length > 0 ? failedUpdates : undefined,
          apiSource: exchangeRateApiKey ? 'Premium API' : 'Free API',
          totalCurrencies: Object.keys(data.rates).length
        },
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error updating exchange rates:", error);
    
    // Log the error to system settings
    await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'last_exchange_rate_error',
        setting_value: new Date().toISOString(),
        description: error.message
      });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
