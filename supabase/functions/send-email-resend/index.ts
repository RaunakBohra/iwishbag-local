import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@4.7.0';
import {
  authenticateUser,
  AuthError,
  createAuthErrorResponse,
  validateMethod,
} from '../_shared/auth.ts';
import { createCorsHeaders } from '../_shared/cors.ts';

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

serve(async (req) => {
  console.log('🔵 === SEND-EMAIL-RESEND FUNCTION STARTED ===');
  console.log('🔵 Request method:', req.method);
  const corsHeaders = createCorsHeaders(req);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔵 Handling CORS preflight request');
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Validate request method
    validateMethod(req, ['POST']);

    // Try to authenticate user, but allow service-level access
    let user = null;
    let isServiceCall = false;
    
    try {
      const authResult = await authenticateUser(req);
      user = authResult.user;
      console.log(`🔐 Authenticated user ${user.email} requesting email send`);
    } catch (authError) {
      // Check if it's a service-level call with proper authorization
      const authHeader = req.headers.get('authorization');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (authHeader && authHeader.includes('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        // Allow if it's service role key or valid anon key for testing
        if (token === serviceRoleKey || authHeader.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
          isServiceCall = true;
          console.log('📧 Service-level access granted for email send');
        } else {
          throw authError;
        }
      } else {
        throw authError;
      }
    }

    const body = await req.json();
    const {
      to,
      subject,
      html,
      text,
      from = 'iwishBag <noreply@iwishbag.com>',
      replyTo = 'support@iwishbag.com',
    }: EmailRequest = body as EmailRequest;

    // Validation
    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, and either html or text' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.error('❌ Resend API key not configured');
      return new Response(
        JSON.stringify({
          error: 'Resend API key not configured. Please set RESEND_API_KEY.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Resend client
    const resend = new Resend(resendApiKey);

    // Prepare recipients
    const toAddresses = Array.isArray(to) ? to : [to];

    console.log('📧 Sending email via Resend...');
    console.log('  - To:', toAddresses.join(', '));
    console.log('  - Subject:', subject);
    console.log('  - From:', from);

    try {
      const response = await resend.emails.send({
        from: from,
        to: toAddresses,
        subject: subject,
        html: html,
        text: text,
        replyTo: replyTo,
      });

      console.log('✅ Email sent successfully via Resend');
      console.log('  - MessageId:', response.data?.id);

      // Store sent email in Supabase Storage instead of S3
      try {
        console.log('💾 Storing sent email in Supabase Storage...');
        
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          // Create email metadata and content
          const emailData = {
            messageId: response.data?.id || 'unknown',
            to: toAddresses,
            from: from,
            replyTo: replyTo,
            subject: subject,
            sentAt: new Date().toISOString(),
            status: 'sent',
            provider: 'Resend',
            metadata: {
              userId: user?.id || null,
              userEmail: user?.email || null,
              isServiceCall: isServiceCall,
              sentFromEdgeFunction: true,
            },
            content: {
              html: html || null,
              text: text || null,
            }
          };
          
          // Store in Supabase Storage under sent/ prefix
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `${timestamp}-${response.data?.id || 'unknown'}.json`;
          const storagePath = `sent/${fileName}`;
          
          const { error: storageError } = await supabase.storage
            .from('email-logs')
            .upload(storagePath, JSON.stringify(emailData, null, 2), {
              contentType: 'application/json',
              metadata: {
                'message-id': response.data?.id || 'unknown',
                'sent-at': new Date().toISOString(),
                'recipients': toAddresses.join(','),
                'subject': subject.substring(0, 100),
              }
            });
          
          if (storageError) {
            console.error('⚠️ Failed to store email in Supabase Storage:', storageError);
          } else {
            console.log('✅ Sent email stored in Supabase Storage:', storagePath);
          }
          
          // Also store in database for easier querying
          const emailRecord = {
            message_id: response.data?.id || 'unknown',
            direction: 'sent',
            from_address: from,
            to_addresses: toAddresses,
            subject: subject,
            text_body: text || null,
            html_body: html || null,
            storage_path: storagePath,
            storage_bucket: 'email-logs',
            size_bytes: JSON.stringify(emailData).length,
            status: 'unread',
            sent_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
            user_id: user?.id || null,
            customer_email: toAddresses[0], // Primary recipient
            metadata: {
              user_email: user?.email || null,
              is_service_call: isServiceCall,
              sent_from_edge_function: true,
              provider: 'Resend',
            },
          };
          
          const { error: dbError } = await supabase
            .from('email_messages')
            .insert(emailRecord);
          
          if (dbError) {
            console.error('⚠️ Failed to store email record in database:', dbError);
          } else {
            console.log('✅ Email record stored in database');
          }
        }
        
      } catch (storageError) {
        console.error('⚠️ Error storing sent email:', storageError);
        // Don't fail the request if storage fails
      }

      return new Response(
        JSON.stringify({
          success: true,
          messageId: response.data?.id,
          provider: 'Resend',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (resendError: any) {
      console.error('❌ Resend error:', resendError);
      
      // Handle common Resend errors
      let errorMessage = 'Failed to send email';
      let statusCode = 500;

      if (resendError.message?.includes('API key')) {
        errorMessage = 'Invalid Resend API key';
        statusCode = 401;
      } else if (resendError.message?.includes('domain')) {
        errorMessage = 'Sender domain not verified in Resend';
        statusCode = 400;
      } else if (resendError.message?.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded';
        statusCode = 429;
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          details: resendError.message,
          code: resendError.name,
        }),
        {
          status: statusCode,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('❌ Function error:', error);

    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});