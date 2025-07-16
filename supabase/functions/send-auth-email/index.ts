import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from '../_shared/cors.ts';
const getEmailTemplate = (type, data)=>{
  const baseUrl = 'https://whyteclub.com';
  switch(type){
    case 'signup_confirmation':
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
              .confirm-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 35px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); transition: transform 0.2s; }
              .confirm-button:hover { transform: translateY(-2px); }
              .features { background: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; }
              .features h3 { color: #333; font-size: 18px; margin-bottom: 15px; }
              .feature-list { list-style: none; padding: 0; margin: 0; }
              .feature-list li { color: #666; margin-bottom: 8px; padding-left: 25px; position: relative; }
              .feature-list li::before { content: "✓"; color: #10b981; font-weight: bold; position: absolute; left: 0; }
              .footer { background: #f1f5f9; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
              .footer-text { color: #64748b; font-size: 14px; margin-bottom: 10px; }
              .link { color: #667eea; text-decoration: none; }
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
                    <a href="${data.confirmationUrl}" class="confirm-button">
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
                    <a href="https://whyteclub.com" class="link">whyteclub.com</a> | 
                    <a href="https://whyteclub.com/contact" class="link">Contact Support</a>
                  </p>
                  <p class="footer-text" style="font-size: 12px; margin-top: 15px;">
                    If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
                    <span style="word-break: break-all;">${data.confirmationUrl}</span>
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };
    case 'password_reset':
      return {
        subject: 'iWishBag - Reset Your Password',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password - iWishBag</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
              .logo { color: white; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
              .header-text { color: rgba(255,255,255,0.9); font-size: 16px; }
              .content { padding: 40px 30px; }
              .title { color: #333; font-size: 24px; font-weight: 600; margin-bottom: 20px; text-align: center; }
              .message { color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
              .button-container { text-align: center; margin: 30px 0; }
              .reset-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 35px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); }
              .security-note { background: #fef3cd; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 20px 0; }
              .security-note p { margin: 0; color: #92400e; font-size: 14px; }
              .footer { background: #f1f5f9; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0; }
              .footer-text { color: #64748b; font-size: 14px; }
            </style>
          </head>
          <body>
            <div style="padding: 20px;">
              <div class="container">
                <div class="header">
                  <div class="logo">iWishBag</div>
                  <div class="header-text">Secure Password Reset</div>
                </div>
                
                <div class="content">
                  <h1 class="title">🔐 Reset Your Password</h1>
                  
                  <p class="message">
                    Hi there!<br><br>
                    We received a request to reset your iWishBag account password. Click the button below to set a new password:
                  </p>
                  
                  <div class="button-container">
                    <a href="${data.resetUrl}" class="reset-button">
                      Reset My Password
                    </a>
                  </div>
                  
                  <div class="security-note">
                    <p><strong>🔒 Security:</strong> This link will expire in 24 hours. If you didn't request this reset, please ignore this email and your password will remain unchanged.</p>
                  </div>
                  
                  <p class="message">
                    For your security, this link can only be used once. If you need to reset your password again, please request a new reset link.
                  </p>
                </div>
                
                <div class="footer">
                  <p class="footer-text">
                    This email was sent by iWishBag Security<br>
                    <a href="https://whyteclub.com">whyteclub.com</a>
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      };
    default:
      throw new Error(`Unknown email type: ${type}`);
  }
};
serve(async (req)=>{
  console.log("🔵 === AUTH EMAIL FUNCTION STARTED ===");
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders(req, ['GET', 'POST', 'PUT', 'DELETE'])
    });
  }
  try {
    const body = await req.json();
    console.log("🔵 Auth email request:", JSON.stringify(body, null, 2));
    const { email, type, user_id, token, redirect_to } = body;
    if (!email || !type) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: email, type'
      }), {
        status: 400,
        headers: {
          ...createCorsHeaders(req, ['GET', 'POST', 'PUT', 'DELETE']),
          'Content-Type': 'application/json'
        }
      });
    }
    // Generate confirmation/reset URLs
    let emailData = {};
    if (type === 'signup_confirmation') {
      // For signup confirmation, we'll generate the URL to our confirmation page
      emailData.confirmationUrl = `https://whyteclub.com/auth/confirm?token=${token}&type=signup&email=${encodeURIComponent(email)}`;
    } else if (type === 'password_reset') {
      emailData.resetUrl = `https://whyteclub.com/auth/reset?token=${token}&type=recovery`;
    }
    const template = getEmailTemplate(type, emailData);
    // Call the send-email function
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }
    const emailPayload = {
      from: 'iWishBag <noreply@whyteclub.com>',
      to: email,
      subject: template.subject,
      html: template.html
    };
    console.log("🔵 Sending email via Resend...");
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Resend API error:', errorData);
      throw new Error(`Resend API error: ${response.status} ${errorData}`);
    }
    const result = await response.json();
    console.log("✅ Auth email sent successfully:", result);
    return new Response(JSON.stringify({
      success: true,
      messageId: result.id,
      type
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Auth email error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to send auth email',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
