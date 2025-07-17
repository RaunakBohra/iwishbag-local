import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
const sendResendEmail = async (to, subject, html) => {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return {
      success: false,
      error: 'API key not configured',
    };
  }
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'iWishBag <noreply@whyteclub.com>',
        to,
        subject,
        html,
      }),
    });
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Resend API error:', errorData);
      return {
        success: false,
        error: errorData,
      };
    }
    const result = await response.json();
    console.log('✅ Email sent via Resend:', result);
    return {
      success: true,
      messageId: result.id,
    };
  } catch (error) {
    console.error('Failed to send email via Resend:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
const getSignupConfirmationEmail = (confirmationUrl) => {
  return {
    subject: 'Welcome to iWishBag - Confirm Your Email',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to iWishBag</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
          .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .header-text { color: rgba(255,255,255,0.9); font-size: 16px; }
          .content { padding: 40px 30px; }
          .welcome-title { color: #333; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center; }
          .message { color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
          .button-container { text-align: center; margin: 30px 0; }
          .confirm-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 35px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); }
          .features { background: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; }
          .features h3 { color: #333; font-size: 18px; margin-bottom: 15px; }
          .feature-list { list-style: none; padding: 0; margin: 0; }
          .feature-list li { color: #666; margin-bottom: 8px; padding-left: 25px; position: relative; }
          .feature-list li::before { content: "✓"; color: #10b981; font-weight: bold; position: absolute; left: 0; }
          .footer { background: #f1f5f9; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
          .footer-text { color: #64748b; font-size: 14px; }
          .security-note { background: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 20px 0; }
          .security-note p { margin: 0; color: #92400e; font-size: 14px; }
        </style>
      </head>
      <body>
        <div style="padding: 20px;">
          <div class="container">
            <div class="header">
              <div class="logo">iWishBag</div>
              <div class="header-text">Shop The World, Delivered To You</div>
            </div>
            
            <div class="content">
              <h1 class="welcome-title">Welcome to iWishBag! 🎉</h1>
              
              <p class="message">
                Hi there!<br><br>
                Thank you for joining iWishBag, your gateway to international shopping! We're excited to help you discover and purchase products from around the world.
              </p>
              
              <div class="button-container">
                <a href="${confirmationUrl}" class="confirm-button">
                  Confirm Your Email Address
                </a>
              </div>
              
              <div class="features">
                <h3>🌟 What you can do with iWishBag:</h3>
                <ul class="feature-list">
                  <li>Shop from Amazon, eBay, Flipkart, Alibaba and more</li>
                  <li>Get instant shipping quotes to India & Nepal</li>
                  <li>Track your orders in real-time</li>
                  <li>Secure international payment processing</li>
                  <li>Expert customs handling and support</li>
                  <li>24/7 customer service</li>
                </ul>
              </div>
              
              <div class="security-note">
                <p><strong>🔒 Security Note:</strong> This confirmation link will expire in 24 hours for your security. If you didn't create an account with iWishBag, you can safely ignore this email.</p>
              </div>
              
              <p class="message">
                If you have any questions, our support team is here to help! Just reply to this email or visit our help center.
              </p>
            </div>
            
            <div class="footer">
              <p class="footer-text">
                This email was sent by iWishBag<br>
                <a href="https://whyteclub.com" style="color: #667eea;">whyteclub.com</a> | 
                <a href="https://whyteclub.com/contact" style="color: #667eea;">Contact Support</a>
              </p>
              <p class="footer-text" style="font-size: 12px; margin-top: 15px;">
                If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
                <span style="word-break: break-all; color: #999;">${confirmationUrl}</span>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};
serve(async (req) => {
  console.log('🔵 === AUTH HOOK TRIGGERED ===');
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  try {
    const payload = await req.json();
    console.log('🔵 Webhook payload:', JSON.stringify(payload, null, 2));
    // Handle user signup confirmation
    if (payload.type === 'INSERT' && payload.table === 'users') {
      const user = payload.record;
      console.log('🔵 New user signup:', user.email);
      // Check if user needs email confirmation
      if (!user.email_confirmed_at && user.confirmation_token) {
        console.log('🔵 Sending signup confirmation email via Resend...');
        // Build confirmation URL
        const confirmationUrl = `https://whyteclub.com/auth/confirm?token=${user.confirmation_token}&type=signup`;
        const emailTemplate = getSignupConfirmationEmail(confirmationUrl);
        const result = await sendResendEmail(user.email, emailTemplate.subject, emailTemplate.html);
        if (result.success) {
          console.log('✅ Signup confirmation email sent successfully');
        } else {
          console.error('❌ Failed to send signup confirmation email:', result.error);
        }
      }
    }
    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('❌ Auth hook error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
