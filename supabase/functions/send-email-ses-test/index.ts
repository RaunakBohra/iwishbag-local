import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SESClient, SendEmailCommand } from "npm:@aws-sdk/client-ses@3.454.0";
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
  console.log('🔵 === SEND-EMAIL-SES-TEST FUNCTION STARTED ===');
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
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // For testing, we'll allow any request with an authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('📧 Processing email request (test mode)');

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

    console.log('🔑 AWS Credentials Check:');
    console.log('  - AWS_ACCESS_KEY_ID exists:', !!awsAccessKeyId);
    console.log('  - AWS_ACCESS_KEY_ID length:', awsAccessKeyId?.length || 0);
    console.log('  - AWS_SECRET_ACCESS_KEY exists:', !!awsSecretAccessKey);
    console.log('  - AWS_SECRET_ACCESS_KEY length:', awsSecretAccessKey?.length || 0);
    console.log('  - AWS_REGION:', awsRegion);

    if (!awsAccessKeyId || !awsSecretAccessKey) {
      console.error('❌ AWS credentials not configured');
      console.error('Available env vars:', Object.keys(Deno.env.toObject()).filter(k => k.startsWith('AWS_') || k.includes('SUPABASE')));
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
      console.error('Error details:', JSON.stringify(sesError, null, 2));
      
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
      } else if (sesError.name === 'AccessDenied') {
        errorMessage = 'AWS SES access denied. Check your IAM permissions.';
        statusCode = 403;
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
  } catch (error: any) {
    console.error('❌ Function error:', error);
    console.error('Error stack:', error.stack);

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