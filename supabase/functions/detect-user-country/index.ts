import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface CountryDetectionResponse {
  country: string;
  currency: string;
  confidence: number;
  source: string;
  ip?: string;
}

interface IPAPIResponse {
  country_code: string;
  country_name: string;
  currency: string;
  ip: string;
  city?: string;
  region?: string;
}

serve(async (req) => {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Get client IP from headers
    const clientIP = req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') ||
                     'unknown';

    console.log(`Detecting country for IP: ${clientIP}`);

    // Skip for local/invalid IPs
    if (!clientIP || clientIP === 'unknown' || clientIP === '127.0.0.1' || clientIP.startsWith('192.168.') || clientIP.startsWith('10.')) {
      return new Response(
        JSON.stringify({
          country: 'US',
          currency: 'USD',
          confidence: 0.1,
          source: 'fallback',
          ip: clientIP
        } as CountryDetectionResponse),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Try multiple IP geolocation APIs
    const apis = [
      {
        name: 'ipapi.co',
        url: `https://ipapi.co/${clientIP}/json/`,
        parseResponse: (data: any) => ({
          country: data.country_code?.toUpperCase(),
          currency: data.currency || getCurrencyForCountry(data.country_code),
          confidence: 0.9
        })
      },
      {
        name: 'ip-api.com', 
        url: `http://ip-api.com/json/${clientIP}?fields=country,countryCode,query`,
        parseResponse: (data: any) => ({
          country: data.countryCode?.toUpperCase(),
          currency: getCurrencyForCountry(data.countryCode),
          confidence: 0.8
        })
      },
      {
        name: 'ipwho.is',
        url: `https://ipwho.is/${clientIP}`,
        parseResponse: (data: any) => ({
          country: data.country_code?.toUpperCase(),
          currency: data.currency?.code || getCurrencyForCountry(data.country_code),
          confidence: 0.85
        })
      }
    ];

    // Try each API with timeout
    for (const api of apis) {
      try {
        console.log(`Trying ${api.name} for IP ${clientIP}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch(api.url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'iwishBag Country Detection Service',
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const parsed = api.parseResponse(data);
        
        if (parsed.country && parsed.country.length === 2) {
          console.log(`Success with ${api.name}: ${clientIP} -> ${parsed.country}`);
          
          return new Response(
            JSON.stringify({
              country: parsed.country,
              currency: parsed.currency,
              confidence: parsed.confidence,
              source: api.name,
              ip: clientIP
            } as CountryDetectionResponse),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          );
        }
      } catch (error) {
        console.warn(`${api.name} failed for IP ${clientIP}:`, error.message);
        continue;
      }
    }

    // All APIs failed, return fallback
    console.log(`All APIs failed for IP ${clientIP}, using fallback`);
    
    return new Response(
      JSON.stringify({
        country: 'US',
        currency: 'USD',
        confidence: 0.1,
        source: 'fallback',
        ip: clientIP
      } as CountryDetectionResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Country detection error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Country detection failed',
        country: 'US',
        currency: 'USD',
        confidence: 0,
        source: 'error'
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper function to map country codes to currencies
function getCurrencyForCountry(countryCode: string): string {
  if (!countryCode) return 'USD';
  
  const currencyMap: Record<string, string> = {
    'IN': 'INR',  // India
    'NP': 'NPR',  // Nepal
    'US': 'USD',  // United States
    'GB': 'GBP',  // United Kingdom
    'CA': 'CAD',  // Canada
    'AU': 'AUD',  // Australia
    'JP': 'JPY',  // Japan
    'CN': 'CNY',  // China
    'KR': 'KRW',  // South Korea
    'SG': 'SGD',  // Singapore
    'MY': 'MYR',  // Malaysia
    'TH': 'THB',  // Thailand
    'BD': 'BDT',  // Bangladesh
    'LK': 'LKR',  // Sri Lanka
    'PK': 'PKR',  // Pakistan
    'DE': 'EUR',  // Germany
    'FR': 'EUR',  // France
    'IT': 'EUR',  // Italy
    'ES': 'EUR',  // Spain
    'NL': 'EUR',  // Netherlands
    'AE': 'AED',  // UAE
    'SA': 'SAR',  // Saudi Arabia
    'BR': 'BRL',  // Brazil
    'MX': 'MXN',  // Mexico
    'RU': 'RUB',  // Russia
    'TR': 'TRY',  // Turkey
    'ZA': 'ZAR',  // South Africa
    'NG': 'NGN',  // Nigeria
    'EG': 'EGP',  // Egypt
    'IL': 'ILS',  // Israel
    'CH': 'CHF',  // Switzerland
    'SE': 'SEK',  // Sweden
    'NO': 'NOK',  // Norway
    'DK': 'DKK',  // Denmark
  };
  
  return currencyMap[countryCode.toUpperCase()] || 'USD';
}