import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'https://iwishbag.com',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Max-Age': '86400',
}

interface PaymentLinkEmailRequest {
  to: string
  customerName: string
  orderNumber: string
  amount: number
  currency: string
  paymentUrl: string
  expiryDate: string
  from?: string
}

// Email template for payment links
function generatePaymentLinkEmailTemplate({
  customerName,
  orderNumber,
  amount,
  currency,
  paymentUrl,
  expiryDate,
}: Omit<PaymentLinkEmailRequest, 'to' | 'from'>): { subject: string; html: string } {
  const currencySymbols: { [key: string]: string } = {
    'USD': '$',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£',
    'NPR': 'Rs.',
    'CAD': 'C$',
    'AUD': 'A$',
    'SGD': 'S$',
  };

  const symbol = currencySymbols[currency] || currency + ' ';
  const formattedAmount = `${symbol}${amount.toFixed(2)}`;
  const formattedExpiryDate = new Date(expiryDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = `Payment Required for Order ${orderNumber} - ${formattedAmount}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Required - iwishBag</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e9ecef;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 10px;
        }
        .alert {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .payment-details {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
        }
        .detail-label {
            font-weight: 600;
            color: #6c757d;
        }
        .detail-value {
            font-weight: 600;
            color: #333;
        }
        .amount {
            font-size: 24px;
            color: #28a745;
            font-weight: bold;
        }
        .payment-button {
            display: block;
            width: 100%;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
            transition: background-color 0.3s ease;
        }
        .payment-button:hover {
            background-color: #218838;
        }
        .expiry-warning {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 8px;
            padding: 15px;
            color: #721c24;
            text-align: center;
            margin: 20px 0;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
        }
        .help-section {
            background-color: #e7f3ff;
            border: 1px solid #b8daff;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
        }
        @media only screen and (max-width: 600px) {
            body {
                padding: 10px;
            }
            .container {
                padding: 20px;
            }
            .detail-row {
                flex-direction: column;
                align-items: flex-start;
            }
            .detail-value {
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">iwishBag</div>
            <p style="margin: 0; color: #6c757d;">International Shopping Made Easy</p>
        </div>

        <h2 style="color: #333; margin-bottom: 20px;">Hello ${customerName || 'Valued Customer'},</h2>
        
        <p>We hope this email finds you well! Your order is ready for processing, and we need to collect the outstanding payment to proceed.</p>

        <div class="alert">
            <strong>⚠️ Payment Required</strong><br>
            Your order ${orderNumber} has an outstanding balance that needs to be settled to continue processing.
        </div>

        <div class="payment-details">
            <h3 style="margin-top: 0; color: #333;">Payment Details</h3>
            <div class="detail-row">
                <span class="detail-label">Order Number:</span>
                <span class="detail-value">${orderNumber}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Amount Due:</span>
                <span class="detail-value amount">${formattedAmount}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Currency:</span>
                <span class="detail-value">${currency}</span>
            </div>
        </div>

        <a href="${paymentUrl}" class="payment-button">
            💳 Pay Now - ${formattedAmount}
        </a>

        <div class="expiry-warning">
            <strong>⏰ Important:</strong> This payment link expires on <strong>${formattedExpiryDate}</strong><br>
            Please complete your payment before this date to avoid any delays.
        </div>

        <div class="help-section">
            <h4 style="margin-top: 0; color: #0066cc;">Need Help?</h4>
            <p style="margin-bottom: 0;">
                If you have any questions about this payment or need assistance, please don't hesitate to contact our support team. We're here to help make your international shopping experience smooth and hassle-free.
            </p>
        </div>

        <p style="margin-top: 30px;">
            <strong>What's Next?</strong><br>
            Once your payment is confirmed, we'll immediately start processing your order. You'll receive a confirmation email with tracking details as soon as your items are shipped.
        </p>

        <p>Thank you for choosing iwishBag for your international shopping needs!</p>

        <div class="footer">
            <p><strong>iwishBag Team</strong></p>
            <p>International Shopping • Global Delivery • Local Support</p>
            <p style="font-size: 12px; margin-top: 20px;">
                This is an automated email. Please do not reply to this message.<br>
                If you didn't request this payment link, please contact our support team immediately.
            </p>
        </div>
    </div>
</body>
</html>
  `;

  return { subject, html };
}

serve(async (req) => {
  console.log("🔵 === SEND-PAYMENT-LINK-EMAIL FUNCTION STARTED ===");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    const body = await req.json();
    console.log("🔵 Payment link email request:", JSON.stringify(body, null, 2));

    const {
      to,
      customerName,
      orderNumber,
      amount,
      currency,
      paymentUrl,
      expiryDate,
      from = 'payments@iwishbag.com'
    }: PaymentLinkEmailRequest = body;

    // Validate required fields
    if (!to || !orderNumber || !amount || !currency || !paymentUrl || !expiryDate) {
      console.log("❌ Missing required fields");
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: to, orderNumber, amount, currency, paymentUrl, expiryDate' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate email template
    const { subject, html } = generatePaymentLinkEmailTemplate({
      customerName,
      orderNumber,
      amount,
      currency,
      paymentUrl,
      expiryDate,
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Send email using the existing send-email function
    console.log("🔵 Calling send-email function...");
    const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        html,
        from
      }
    });

    if (emailError) {
      console.error("❌ Error sending email:", emailError);
      return new Response(
        JSON.stringify({ error: 'Failed to send payment link email', details: emailError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log("✅ Payment link email sent successfully");
    
    // Log the email activity in the database
    try {
      const { error: logError } = await supabase
        .from('email_logs')
        .insert({
          recipient: to,
          subject,
          email_type: 'payment_link',
          status: 'sent',
          metadata: {
            orderNumber,
            amount,
            currency,
            expiryDate,
            paymentUrl: paymentUrl.substring(0, 50) + '...' // Log partial URL for privacy
          }
        });

      if (logError) {
        console.error("⚠️ Failed to log email activity:", logError);
        // Don't fail the request for logging errors
      }
    } catch (logError) {
      console.error("⚠️ Error logging email activity:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment link email sent successfully',
        emailResult 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error("❌ Top-level function error:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})