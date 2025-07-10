import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
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
  console.log("🔵 Request headers:", Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("🔵 Handling CORS preflight request");
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
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

    // Check if we're in development mode
    const isDevelopment = Deno.env.get('ENVIRONMENT') === 'development' || 
                         Deno.env.get('IS_LOCAL') === 'true' ||
                         !Deno.env.get('RESEND_API_KEY');
    
    console.log("🔵 Environment check:");
    console.log("  - ENVIRONMENT:", Deno.env.get('ENVIRONMENT'));
    console.log("  - IS_LOCAL:", Deno.env.get('IS_LOCAL'));
    console.log("  - isDevelopment:", isDevelopment);

    if (isDevelopment) {
      // Use local Inbucket SMTP for development
      console.log("📧 Using Inbucket for local email testing");
      
      try {
        const client = new SmtpClient();
        
        await client.connectTLS({
          hostname: "localhost",
          port: 54325,
          username: "inbucket",
          password: "inbucket",
        });
        
        await client.send({
          from: from,
          to: to,
          subject: subject,
          content: html,
          html: html,
        });
        
        await client.close();
        
        console.log("✅ Email sent to Inbucket successfully");
        console.log("📬 View email at: http://localhost:54324");
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Email sent to local Inbucket',
            inbucketUrl: 'http://localhost:54324'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } catch (error) {
        console.log("⚠️ Inbucket failed, falling back to console log");
        console.log("📧 EMAIL CONTENT:");
        console.log("To:", to);
        console.log("From:", from);
        console.log("Subject:", subject);
        console.log("HTML:", html);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Email logged to console (Inbucket unavailable)',
            emailData: { to, from, subject }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Production: Use Resend API
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
        return new Response(
          JSON.stringify({ error: `Failed to send email with status: ${response.status}`, details: errorData }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
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
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: apiError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
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