import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  subject: string
  html: string
  from?: string
}

serve(async (req) => {
  console.log("🔵 === SEND-EMAIL FUNCTION STARTED ===");
  console.log("🔵 Request method:", req.method);
  console.log("🔵 Request URL:", req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("🔵 Handling CORS preflight request");
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("🔵 Parsing request body...");
    const body = await req.json();
    console.log("🔵 Request body received:", JSON.stringify(body, null, 2));

    const { to, subject, html, from = 'noreply@whyteclub.com' }: EmailRequest = body as EmailRequest;
    console.log("🔵 Extracted values:");
    console.log("  - to:", to);
    console.log("  - subject:", subject);
    console.log("  - html length:", html?.length || 0);
    console.log("  - from:", from);

    if (!to || !subject || !html) {
      console.log("❌ Missing required fields");
      console.log("  - to exists:", !!to);
      console.log("  - subject exists:", !!subject);
      console.log("  - html exists:", !!html);
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Resend API key from environment
    console.log("🔵 Getting Resend API key from environment...");
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    console.log("🔵 API key exists:", !!resendApiKey);
    console.log("🔵 API key length:", resendApiKey?.length || 0);
    console.log("🔵 API key starts with:", resendApiKey?.substring(0, 5) + "...");
    
    if (!resendApiKey) {
      console.log("❌ Resend API key not configured");
      return new Response(
        JSON.stringify({ error: 'Resend API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send email via Resend API
    console.log("🔵 Preparing to call Resend API...");
    const requestBody = {
      from,
      to,
      subject,
      html,
    };
    console.log("🔵 Request body for Resend:", JSON.stringify(requestBody, null, 2));
    
    try {
      console.log("🔵 Making fetch request to Resend API...");
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log("🔵 Resend API response received");
      console.log("🔵 Response status:", response.status);
      console.log("🔵 Response status text:", response.statusText);
      console.log("🔵 Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.text();
        console.log("❌ Resend API error response:", errorData);
        console.error('!!! RESEND API ERROR !!!:', errorData);
        throw new Error(`Failed to send email with status: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Resend API success response:", JSON.stringify(result, null, 2));
      
      return new Response(
        JSON.stringify({ success: true, messageId: result.id }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (apiError) {
      console.log("❌ Resend API call failed:", apiError);
      console.error('!!! RESEND API CALL FAILED !!!:', apiError);
      throw apiError; // Re-throw to ensure the function fails as expected
    }

  } catch (error) {
    console.log("❌ Top-level function error:", error);
    console.error('!!! TOP-LEVEL FUNCTION ERROR !!!:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 