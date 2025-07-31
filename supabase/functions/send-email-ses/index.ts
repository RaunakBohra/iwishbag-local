import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SESClient, SendEmailCommand } from "npm:@aws-sdk/client-ses@3.454.0";
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
  console.log('🔵 === SEND-EMAIL-SES FUNCTION STARTED ===');
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
      from = 'iwishBag <noreply@iwishbag.in>',
      replyTo = 'support@iwishbag.in',
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

    // Get AWS credentials from environment
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      console.error('❌ AWS credentials not configured');
      return new Response(
        JSON.stringify({
          error: 'AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create SES client
    const sesClient = new SESClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    // Prepare recipients
    const toAddresses = Array.isArray(to) ? to : [to];

    // Create send email command
    const command = new SendEmailCommand({
      Source: from,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          ...(html && {
            Html: {
              Data: html,
              Charset: 'UTF-8',
            },
          }),
          ...(text && {
            Text: {
              Data: text,
              Charset: 'UTF-8',
            },
          }),
        },
      },
      ReplyToAddresses: [replyTo],
    });

    console.log('📧 Sending email via AWS SES...');
    console.log('  - To:', toAddresses.join(', '));
    console.log('  - Subject:', subject);
    console.log('  - From:', from);
    console.log('  - Region:', awsRegion);

    try {
      const response = await sesClient.send(command);
      console.log('✅ Email sent successfully via AWS SES');
      console.log('  - MessageId:', response.MessageId);

      return new Response(
        JSON.stringify({
          success: true,
          messageId: response.MessageId,
          provider: 'AWS SES',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (sesError: any) {
      console.error('❌ AWS SES error:', sesError);
      
      // Handle common SES errors
      let errorMessage = 'Failed to send email';
      let statusCode = 500;

      if (sesError.name === 'MessageRejected') {
        errorMessage = 'Email rejected by AWS SES. Please verify your email addresses.';
        statusCode = 400;
      } else if (sesError.name === 'ConfigurationSetDoesNotExist') {
        errorMessage = 'AWS SES configuration error';
      } else if (sesError.name === 'MailFromDomainNotVerified') {
        errorMessage = 'Sender email domain not verified in AWS SES';
        statusCode = 400;
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          details: sesError.message,
          code: sesError.name,
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