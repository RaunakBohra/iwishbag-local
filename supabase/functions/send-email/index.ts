import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from "../_shared/cors.ts";

type EmailTemplate = 'quote_sent' | 'quote_approved' | 'quote_rejected' | 'order_shipped' | 'order_delivered' | 'contact_form' | 'quote_confirmation' | 'quote_ready' | 'quote_accepted' | 'payment_confirmed' | 'order_placed' | 'quote_cancelled' | 'quote_reminder';

interface EmailRequest {
  to: string;
  template: EmailTemplate;
  data: Record<string, any>;
  from?: string;
}

// Email templates
const templates: Record<EmailTemplate, (data: Record<string, any>) => { subject: string; html: string }> = {
  quote_confirmation: (data) => ({
    subject: `Quote Request Confirmed - ${data.quoteId}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Quote Request Confirmed!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Thank you for choosing WishBag</p>
        </div>
        
        <div style="padding: 30px; background: #fff;">
          <p>Dear Customer,</p>
          
          <p>We've received your quote request and are excited to help you shop from international websites!</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Request Details</h3>
            <p><strong>Quote ID:</strong> ${data.quoteId}</p>
            <p><strong>Items:</strong> ${data.itemCount} product(s)</p>
            <p><strong>Estimated Processing Time:</strong> ${data.estimatedTime}</p>
          </div>
          
          <p>Our team is now analyzing your products and will provide you with a detailed quote including:</p>
          <ul style="color: #6c757d;">
            <li>Product costs and availability</li>
            <li>International shipping fees</li>
            <li>Customs duties and taxes</li>
            <li>Handling charges</li>
            <li>Total cost in your local currency</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              View Your Dashboard
            </a>
          </div>
          
          <p>You'll receive another email once your quote is ready for review.</p>
          
          <p>Best regards,<br>
          The WishBag Team</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px;">
          <p>Questions? Contact us at support@wishbag.com</p>
        </div>
      </div>
    `
  }),

  quote_ready: (data) => ({
    subject: `Your Quote is Ready - ${data.quoteId}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Your Quote is Ready! 🎉</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Time to review and approve</p>
        </div>
        
        <div style="padding: 30px; background: #fff;">
          <p>Dear Customer,</p>
          
          <p>Great news! We've analyzed your products and your quote is ready for review.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Quote Summary</h3>
            <p><strong>Quote ID:</strong> ${data.quoteId}</p>
            <p><strong>Total Amount:</strong> ${data.currency} ${data.totalAmount}</p>
            <p><strong>Items:</strong> ${data.itemCount} product(s)</p>
          </div>
          
          <p>Your quote includes a detailed breakdown of all costs:</p>
          <ul style="color: #6c757d;">
            <li>Product costs</li>
            <li>International shipping</li>
            <li>Customs duties and taxes</li>
            <li>Handling fees</li>
            <li>Payment processing</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.quoteUrl}" 
               style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Review Your Quote
            </a>
          </div>
          
          <p>Once you approve the quote, you can proceed to checkout and we'll start processing your order.</p>
          
          <p>Best regards,<br>
          The WishBag Team</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px;">
          <p>Questions? Contact us at support@wishbag.com</p>
        </div>
      </div>
    `
  }),

  quote_accepted: (data) => ({
    subject: `Quote Approved - ${data.quoteId}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Quote Approved! ✅</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Ready for checkout</p>
        </div>
        
        <div style="padding: 30px; background: #fff;">
          <p>Dear Customer,</p>
          
          <p>Excellent! You've approved your quote and it's been added to your cart.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Order Summary</h3>
            <p><strong>Quote ID:</strong> ${data.quoteId}</p>
            <p><strong>Total Amount:</strong> ${data.currency} ${data.totalAmount}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" 
               style="background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Proceed to Checkout
            </a>
          </div>
          
          <p>You can now complete your purchase using your preferred payment method.</p>
          
          <p>Best regards,<br>
          The WishBag Team</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px;">
          <p>Questions? Contact us at support@wishbag.com</p>
        </div>
      </div>
    `
  }),

  payment_confirmed: (data) => ({
    subject: `Payment Confirmed - ${data.quoteId}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Payment Confirmed! 💳</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your order is being processed</p>
        </div>
        
        <div style="padding: 30px; background: #fff;">
          <p>Dear Customer,</p>
          
          <p>Thank you! Your payment has been confirmed and we're now processing your order.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Order Details</h3>
            <p><strong>Order ID:</strong> ${data.quoteId}</p>
            <p><strong>Amount Paid:</strong> ${data.currency} ${data.totalAmount}</p>
          </div>
          
          <p>What happens next:</p>
          <ol style="color: #6c757d;">
            <li>We'll place your order with the merchant</li>
            <li>Items will be shipped to our facility</li>
            <li>We'll consolidate and ship to you</li>
            <li>You'll receive tracking information</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" 
               style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Track Your Order
            </a>
          </div>
          
          <p>Best regards,<br>
          The WishBag Team</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px;">
          <p>Questions? Contact us at support@wishbag.com</p>
        </div>
      </div>
    `
  }),

  order_placed: (data) => ({
    subject: `Order Placed - ${data.quoteId}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Order Placed! 📦</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your items are being ordered</p>
        </div>
        
        <div style="padding: 30px; background: #fff;">
          <p>Dear Customer,</p>
          
          <p>Great news! We've successfully placed your order with the merchant.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Order Status</h3>
            <p><strong>Order ID:</strong> ${data.quoteId}</p>
            <p><strong>Status:</strong> Order Placed</p>
          </div>
          
          <p>Next steps:</p>
          <ul style="color: #6c757d;">
            <li>Merchant will process and ship your items</li>
            <li>Items will arrive at our facility</li>
            <li>We'll consolidate and prepare for international shipping</li>
            <li>You'll receive tracking information</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" 
               style="background: linear-gradient(135deg, #fd7e14 0%, #e83e8c 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Track Progress
            </a>
          </div>
          
          <p>Best regards,<br>
          The WishBag Team</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px;">
          <p>Questions? Contact us at support@wishbag.com</p>
        </div>
      </div>
    `
  }),

  order_shipped: (data) => ({
    subject: `Order Shipped - ${data.quoteId}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #007bff 0%, #6610f2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Order Shipped! 🚚</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your package is on its way</p>
        </div>
        
        <div style="padding: 30px; background: #fff;">
          <p>Dear Customer,</p>
          
          <p>Exciting news! Your order has been shipped and is on its way to you.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Shipping Details</h3>
            <p><strong>Order ID:</strong> ${data.quoteId}</p>
            <p><strong>Tracking Number:</strong> ${data.trackingNumber || 'Will be provided soon'}</p>
            <p><strong>Carrier:</strong> ${data.carrier || 'International Shipping'}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" 
               style="background: linear-gradient(135deg, #007bff 0%, #6610f2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Track Your Package
            </a>
          </div>
          
          <p>Estimated delivery time: 7-14 business days</p>
          
          <p>Best regards,<br>
          The WishBag Team</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px;">
          <p>Questions? Contact us at support@wishbag.com</p>
        </div>
      </div>
    `
  }),

  order_delivered: (data) => ({
    subject: `Order Delivered - ${data.quoteId}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Order Delivered! 🎉</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your package has arrived</p>
        </div>
        
        <div style="padding: 30px; background: #fff;">
          <p>Dear Customer,</p>
          
          <p>Fantastic! Your order has been successfully delivered.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Delivery Confirmation</h3>
            <p><strong>Order ID:</strong> ${data.quoteId}</p>
            <p><strong>Status:</strong> Delivered</p>
          </div>
          
          <p>Thank you for choosing WishBag for your international shopping needs!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" 
               style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Shop Again
            </a>
          </div>
          
          <p>We hope you love your new items!</p>
          
          <p>Best regards,<br>
          The WishBag Team</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px;">
          <p>Questions? Contact us at support@wishbag.com</p>
        </div>
      </div>
    `
  }),

  quote_cancelled: (data) => ({
    subject: `Quote Cancelled - ${data.quoteId}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Quote Cancelled</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">We're here to help</p>
        </div>
        
        <div style="padding: 30px; background: #fff;">
          <p>Dear Customer,</p>
          
          <p>We're sorry to inform you that your quote has been cancelled.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Quote Details</h3>
            <p><strong>Quote ID:</strong> ${data.quoteId}</p>
            <p><strong>Status:</strong> Cancelled</p>
          </div>
          
          <p>If you have any questions about this cancellation, please don't hesitate to contact us.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" 
               style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Request New Quote
            </a>
          </div>
          
          <p>Best regards,<br>
          The WishBag Team</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px;">
          <p>Questions? Contact us at support@wishbag.com</p>
        </div>
      </div>
    `
  }),

  quote_reminder: (data) => ({
    subject: `Quote Reminder - ${data.quoteId}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">Quote Reminder</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your quote is ready for review</p>
        </div>
        
        <div style="padding: 30px; background: #fff;">
          <p>Dear Customer,</p>
          
          <p>We noticed you haven't reviewed your quote yet. It's been ${data.daysSinceRequest} days since you requested it.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Quote Details</h3>
            <p><strong>Quote ID:</strong> ${data.quoteId}</p>
            <p><strong>Days Since Request:</strong> ${data.daysSinceRequest}</p>
          </div>
          
          <p>Your quote is ready and waiting for your review. Don't miss out on your international shopping opportunity!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.dashboardUrl}" 
               style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
              Review Your Quote
            </a>
          </div>
          
          <p>Best regards,<br>
          The WishBag Team</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 14px;">
          <p>Questions? Contact us at support@wishbag.com</p>
        </div>
      </div>
    `
  }),

  quote_sent: (data) => ({
    subject: `Your Quote #${data.quoteId} is Ready`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Your Quote is Ready!</h2>
        <p>Dear ${data.customerName},</p>
        <p>Your quote #${data.quoteId} is ready for review.</p>
        <p>Total Amount: ${data.currency} ${data.totalAmount}</p>
        <a href="${frontendUrl}/dashboard" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Quote in Dashboard
        </a>
      </div>
    `
  }),
  quote_approved: (data) => ({
    subject: `Quote #${data.quoteId} Approved`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Quote Approved!</h2>
        <p>Dear ${data.customerName},</p>
        <p>Your quote #${data.quoteId} has been approved.</p>
        <p>Total Amount: ${data.currency} ${data.totalAmount}</p>
        <a href="${frontendUrl}/checkout" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Proceed to Checkout
        </a>
      </div>
    `
  }),
  quote_rejected: (data) => ({
    subject: `Quote #${data.quoteId} Rejected`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Quote Rejected</h2>
        <p>Dear ${data.customerName},</p>
        <p>Your quote #${data.quoteId} has been rejected.</p>
        <p>Reason: ${data.rejectionReason}</p>
        <a href="${frontendUrl}/dashboard" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Details
        </a>
      </div>
    `
  }),
  order_shipped: (data) => ({
    subject: `Order #${data.quoteId} Shipped`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Your Order Has Been Shipped!</h2>
        <p>Dear ${data.customerName},</p>
        <p>Your order #${data.quoteId} has been shipped.</p>
        <p>Tracking Number: ${data.trackingNumber}</p>
        <p>Carrier: ${data.carrier}</p>
        <a href="${frontendUrl}/dashboard" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Track Order
        </a>
      </div>
    `
  }),
  order_delivered: (data) => ({
    subject: `Order #${data.quoteId} Delivered`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Order Delivered!</h2>
        <p>Dear ${data.customerName},</p>
        <p>Your order #${data.quoteId} has been delivered.</p>
        <a href="${frontendUrl}/dashboard" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Order Details
        </a>
      </div>
    `
  }),
  contact_form: (data) => ({
    subject: `Contact Form Submission - ${data.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
        <p><strong>Message:</strong></p>
          <p>${data.message}</p>
      </div>
    `
  }),
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
      }
    });
  }

  // Check environment variables only for actual requests
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const frontendUrl = Deno.env.get("FRONTEND_URL");

  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY environment variable is not set" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  if (!frontendUrl) {
    return new Response(
      JSON.stringify({ error: "FRONTEND_URL environment variable is not set" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  // Create Resend instance with API key
  const resend = new Resend(resendApiKey);

  try {
    const { to, template, data, from = "WishBag <noreply@resend.dev>" }: EmailRequest = await req.json();

    if (!to || !template || !data) {
      throw new Error("Missing required fields: to, template, data");
    }

    // Validate template exists
    if (!templates[template]) {
      throw new Error(`Invalid template: ${template}`);
    }

    const { subject, html } = templates[template](data);

    console.log(`Sending ${template} email to: ${to}`);

    try {
    const emailResponse = await resend.emails.send({
      from,
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
    } catch (emailError: any) {
      console.error("Resend API error:", emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Email service error: ${emailError.message}` 
        }),
        {
          status: 500,
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders 
          },
        }
      );
    }

  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
