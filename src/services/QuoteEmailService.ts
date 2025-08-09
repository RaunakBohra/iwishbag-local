// ============================================================================
// Quote Email Service - Handles sending quotes with share links
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface EmailQuoteData {
  id: string;
  quote_number?: string;
  customer_email: string;
  customer_name?: string;
  share_token: string;
  expires_at?: string;
  validity_days: number;
  total_quote_origincurrency: number;
  customer_currency: string;
  total_quote_origincurrency?: number;
  items: any[];
  customer_message?: string;
  payment_terms?: string;
  reminder_count?: number;
}

export class QuoteEmailService {
  private static instance: QuoteEmailService;
  
  static getInstance(): QuoteEmailService {
    if (!QuoteEmailService.instance) {
      QuoteEmailService.instance = new QuoteEmailService();
    }
    return QuoteEmailService.instance;
  }

  // Generate the share URL for a quote
  private getShareUrl(shareToken: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/quote/view/${shareToken}`;
  }

  // Send initial quote email
  async sendQuoteEmail(quoteId: string): Promise<boolean> {
    try {
      // Fetch quote data
      const { data: quote, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error || !quote) {
        console.error('Quote not found:', error);
        return false;
      }

      const shareUrl = this.getShareUrl(quote.share_token);
      const expiryDate = quote.expires_at ? new Date(quote.expires_at) : null;

      // Email template data
      const emailData = {
        to: quote.customer_email,
        subject: `Your Quote #${quote.quote_number || quote.id.slice(0, 8)} from iwishBag`,
        html: this.generateQuoteEmailHtml(quote, shareUrl, expiryDate),
        text: this.generateQuoteEmailText(quote, shareUrl, expiryDate),
      };

      // Send email via Resend Edge Function
      const { data, error: sendError } = await supabase.functions.invoke('send-email-resend', {
        body: {
          ...emailData,
          from: 'iwishBag <noreply@iwishbag.com>', // Your verified domain
          replyTo: 'support@iwishbag.com',
        },
      });

      if (sendError) {
        console.error('Error sending email:', sendError);
        throw new Error('Failed to send email');
      }

      console.log('Quote email sent successfully:', data);

      // Update quote to mark as sent
      await supabase
        .from('quotes_v2')
        .update({ 
          email_sent: true,
          sent_at: new Date().toISOString(),
          status: 'sent'
        })
        .eq('id', quoteId);

      return true;
    } catch (error) {
      console.error('Error in sendQuoteEmail:', error);
      return false;
    }
  }

  // Send reminder email
  async sendReminderEmail(quoteId: string): Promise<boolean> {
    try {
      const { data: quote, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error || !quote) return false;

      const shareUrl = this.getShareUrl(quote.share_token);
      const reminderNumber = (quote.reminder_count || 0) + 1;

      // Email template data
      const emailData = {
        to: quote.customer_email,
        subject: `Reminder: Your Quote #${quote.quote_number || quote.id.slice(0, 8)} is waiting`,
        html: this.generateReminderEmailHtml(quote, shareUrl, reminderNumber),
        text: this.generateReminderEmailText(quote, shareUrl, reminderNumber),
      };

      // Send email via Resend Edge Function
      const { data, error: sendError } = await supabase.functions.invoke('send-email-resend', {
        body: {
          ...emailData,
          from: 'iwishBag <noreply@iwishbag.com>', // Your verified domain
          replyTo: 'support@iwishbag.com',
        },
      });

      if (sendError) {
        console.error('Error sending reminder email:', sendError);
        throw new Error('Failed to send reminder email');
      }

      console.log('Reminder email sent successfully:', data);

      // Update reminder count
      await supabase.rpc('send_quote_reminder', { quote_id: quoteId });

      return true;
    } catch (error) {
      console.error('Error sending reminder:', error);
      return false;
    }
  }

  // Generate HTML email for quote
  private generateQuoteEmailHtml(quote: EmailQuoteData, shareUrl: string, expiryDate: Date | null): string {
    const totalAmount = formatCurrency(
      quote.total_quote_origincurrency,
      quote.customer_currency || 'USD'
    );

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quote from iwishBag</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
    <h1 style="color: #2563eb; margin-bottom: 20px;">Your Quote is Ready!</h1>
    
    <p>Hi ${quote.customer_name || 'there'},</p>
    
    <p>Thank you for your interest! Your personalized quote is ready for review.</p>
    
    ${quote.customer_message ? `
    <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Message from our team:</strong></p>
      <p style="margin: 5px 0 0 0;">${quote.customer_message}</p>
    </div>
    ` : ''}
    
    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">Quote Summary</h2>
      
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Quote Number:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <strong>#${quote.quote_number || quote.id.slice(0, 8)}</strong>
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Items:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${quote.items.length} item${quote.items.length !== 1 ? 's' : ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">Total Amount:</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <strong style="color: #2563eb; font-size: 18px;">${totalAmount}</strong>
          </td>
        </tr>
        ${quote.payment_terms ? `
        <tr>
          <td style="padding: 8px 0;">Payment Terms:</td>
          <td style="padding: 8px 0; text-align: right;">${quote.payment_terms}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${shareUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        View Full Quote Details
      </a>
    </div>
    
    ${expiryDate ? `
    <p style="text-align: center; color: #6b7280; font-size: 14px;">
      This quote is valid for ${quote.validity_days} days and expires on ${format(expiryDate, 'MMMM d, yyyy')}
    </p>
    ` : ''}
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <div style="text-align: center; color: #6b7280; font-size: 14px;">
      <p>Need to make changes? Simply reply to this email or contact us.</p>
      <p style="margin-top: 20px;">
        <a href="${shareUrl}" style="color: #2563eb;">View Quote</a> | 
        <a href="${window.location.origin}/contact" style="color: #2563eb;">Contact Us</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  // Generate plain text email for quote
  private generateQuoteEmailText(quote: EmailQuoteData, shareUrl: string, expiryDate: Date | null): string {
    const totalAmount = formatCurrency(
      quote.total_quote_origincurrency,
      quote.customer_currency || 'USD'
    );

    return `
Your Quote is Ready!

Hi ${quote.customer_name || 'there'},

Thank you for your interest! Your personalized quote is ready for review.

${quote.customer_message ? `Message from our team:\n${quote.customer_message}\n` : ''}

QUOTE SUMMARY
Quote Number: #${quote.quote_number || quote.id.slice(0, 8)}
Items: ${quote.items.length} item${quote.items.length !== 1 ? 's' : ''}
Total Amount: ${totalAmount}
${quote.payment_terms ? `Payment Terms: ${quote.payment_terms}` : ''}

View Full Quote Details: ${shareUrl}

${expiryDate ? `This quote is valid for ${quote.validity_days} days and expires on ${format(expiryDate, 'MMMM d, yyyy')}` : ''}

Need to make changes? Simply reply to this email or contact us.

Best regards,
The iwishBag Team
    `;
  }

  // Generate HTML reminder email
  private generateReminderEmailHtml(quote: EmailQuoteData, shareUrl: string, reminderNumber: number): string {
    const totalAmount = formatCurrency(
      quote.total_quote_origincurrency,
      quote.customer_currency || 'USD'
    );

    const reminderMessages = [
      "Just a friendly reminder about your quote",
      "Your quote is still available",
      "Last reminder about your quote"
    ];

    const message = reminderMessages[Math.min(reminderNumber - 1, 2)];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quote Reminder from iwishBag</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #fef3c7; padding: 30px; border-radius: 10px;">
    <h1 style="color: #d97706; margin-bottom: 20px;">⏰ ${message}</h1>
    
    <p>Hi ${quote.customer_name || 'there'},</p>
    
    <p>We noticed you haven't had a chance to review your quote yet. It's still available and waiting for you!</p>
    
    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">Quote Details</h2>
      
      <p><strong>Quote #${quote.quote_number || quote.id.slice(0, 8)}</strong></p>
      <p>Total: <strong style="color: #d97706; font-size: 20px;">${totalAmount}</strong></p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${shareUrl}" style="display: inline-block; background-color: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Review Your Quote Now
      </a>
    </div>
    
    <p style="text-align: center; color: #92400e;">
      Don't miss out! Your quote may expire soon.
    </p>
  </div>
</body>
</html>
    `;
  }

  // Generate plain text reminder email
  private generateReminderEmailText(quote: EmailQuoteData, shareUrl: string, reminderNumber: number): string {
    const totalAmount = formatCurrency(
      quote.total_quote_origincurrency,
      quote.customer_currency || 'USD'
    );

    const reminderMessages = [
      "Just a friendly reminder about your quote",
      "Your quote is still available",
      "Last reminder about your quote"
    ];

    const message = reminderMessages[Math.min(reminderNumber - 1, 2)];

    return `
${message}

Hi ${quote.customer_name || 'there'},

We noticed you haven't had a chance to review your quote yet. It's still available and waiting for you!

Quote #${quote.quote_number || quote.id.slice(0, 8)}
Total: ${totalAmount}

Review Your Quote Now: ${shareUrl}

Don't miss out! Your quote may expire soon.

Best regards,
The iwishBag Team
    `;
  }
}