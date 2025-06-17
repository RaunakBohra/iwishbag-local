import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const frontendUrl = Deno.env.get("FRONTEND_URL");

if (!resendApiKey) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

if (!frontendUrl) {
  throw new Error("FRONTEND_URL environment variable is not set");
}

const resend = new Resend(resendApiKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmailTemplate = 'quote_sent' | 'quote_approved' | 'quote_rejected' | 'order_shipped' | 'order_delivered' | 'contact_form';

interface EmailRequest {
  to: string;
  template: EmailTemplate;
  data: Record<string, any>;
  from?: string;
}

// Email templates
const templates: Record<EmailTemplate, (data: Record<string, any>) => { subject: string; html: string }> = {
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
    subject: `Thank you for contacting WishBag`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Thank You for Contacting Us!</h2>
        <p>Dear ${data.name},</p>
        <p>We have received your message and will get back to you within 24 hours.</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Message</h3>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p>${data.message}</p>
        </div>
        <p>Best regards,<br>The WishBag Team</p>
      </div>
    `
  })
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, template, data, from = "WishBag <noreply@resend.dev>" }: EmailRequest = await req.json();

    if (!to || !template || !data) {
      throw new Error("Missing required fields: to, template, data");
    }

    const { subject, html } = templates[template](data);

    console.log(`Sending ${template} email to: ${to}`);

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

  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
