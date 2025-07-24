import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEmailSettings } from '@/hooks/useEmailSettings';
import { Quote } from '@/types/quote';

type EmailTemplate =
  | 'quote_sent'
  | 'quote_approved'
  | 'quote_rejected'
  | 'order_shipped'
  | 'order_delivered'
  | 'contact_form'
  | 'bank_transfer_details'
  | 'password_reset'
  | 'password_reset_success'
  | 'payment_link'
  | 'ticket_created'
  | 'ticket_status_update'
  | 'ticket_reply'
  | 'ticket_closed'
  | 'admin_new_ticket'
  | 'admin_new_reply'
  | 'quote_verification_email'
  | 'quote_verification_success';

interface QuoteEmailData {
  quoteId: string;
  customerName?: string;
  totalAmount?: string | number;
  currency?: string;
  rejectionReason?: string;
  trackingNumber?: string;
  carrier?: string;
  bankDetails?: string;
}

interface PasswordResetEmailData {
  resetLink: string;
  customerName?: string;
}

interface QuoteVerificationEmailData {
  quoteId: string;
  customerName?: string;
  customerEmail: string;
  verificationLink: string;
  expiryHours: number;
}

interface ContactFormEmailData {
  subject: string;
  message: string;
  name: string;
  email: string;
}

interface PaymentLinkEmailData {
  quoteId: string;
  customerName?: string;
  totalAmount?: string | number;
  currency?: string;
  paymentLink: string;
}

interface TicketEmailData {
  ticketId: string;
  ticketSubject?: string;
  customerName?: string;
  ticketStatus?: string;
  replyMessage?: string;
  ticketCategory?: string;
  assignedTo?: string;
  priority?: string;
  relatedOrderId?: string;
}

type EmailData =
  | QuoteEmailData
  | PasswordResetEmailData
  | QuoteVerificationEmailData
  | ContactFormEmailData
  | PaymentLinkEmailData
  | TicketEmailData;

interface EmailNotificationOptions {
  to: string;
  template: EmailTemplate;
  data: EmailData;
  from?: string;
}

// Helper function to get access token
const getAccessToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token;
};

export const useEmailNotifications = () => {
  const { toast } = useToast();
  const { shouldSendEmail } = useEmailSettings();

  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, template, data, from }: EmailNotificationOptions) => {
      // Determine email type for settings check
      let emailType:
        | 'quote_notification'
        | 'order_notification'
        | 'ticket_notification'
        | undefined;

      if (['quote_sent', 'quote_approved', 'quote_rejected'].includes(template)) {
        emailType = 'quote_notification';
      } else if (['order_shipped', 'order_delivered'].includes(template)) {
        emailType = 'order_notification';
      } else if (
        [
          'ticket_created',
          'ticket_status_update',
          'ticket_reply',
          'ticket_closed',
          'admin_new_ticket',
          'admin_new_reply',
        ].includes(template)
      ) {
        emailType = 'ticket_notification';
      }

      // Check if this type of email is enabled
      if (emailType && !shouldSendEmail(emailType)) {
        console.log(`${emailType} emails are disabled`);
        return { skipped: true, message: `${emailType} emails are disabled` };
      }

      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error('User not authenticated - cannot send email');
      }

      // Generate appropriate subject based on template
      let subject = '';
      switch (template) {
        case 'password_reset':
          subject = 'Reset Your Password - iwishBag';
          break;
        case 'password_reset_success':
          subject = 'Password Reset Successful - iwishBag';
          break;
        case 'contact_form':
          subject = 'subject' in data ? `Contact Form: ${data.subject}` : 'Contact Form';
          break;
        case 'ticket_created':
          subject =
            'ticketSubject' in data
              ? `New Support Ticket: ${data.ticketSubject}`
              : 'New Support Ticket Created';
          break;
        case 'ticket_status_update':
          subject =
            'ticketSubject' in data
              ? `Ticket Update: ${data.ticketSubject}`
              : 'Support Ticket Update';
          break;
        case 'ticket_reply':
          subject =
            'ticketSubject' in data
              ? `New Reply: ${data.ticketSubject}`
              : 'New Support Ticket Reply';
          break;
        case 'ticket_closed':
          subject =
            'ticketSubject' in data
              ? `Ticket Closed: ${data.ticketSubject}`
              : 'Support Ticket Closed';
          break;
        case 'admin_new_ticket':
          subject =
            'ticketSubject' in data
              ? `[ADMIN] New Ticket: ${data.ticketSubject}`
              : '[ADMIN] New Support Ticket';
          break;
        case 'admin_new_reply':
          subject =
            'ticketSubject' in data
              ? `[ADMIN] New Reply: ${data.ticketSubject}`
              : '[ADMIN] New Ticket Reply';
          break;
        case 'quote_verification_email':
          subject =
            'quoteId' in data
              ? `Verify Your Quote Approval - Quote #${data.quoteId}`
              : 'Verify Your Quote Approval';
          break;
        case 'quote_verification_success':
          subject =
            'quoteId' in data
              ? `Quote Approved Successfully - Quote #${data.quoteId}`
              : 'Quote Approved Successfully';
          break;
        default: {
          const quoteId = 'quoteId' in data ? data.quoteId : 'N/A';
          subject = `Quote ${quoteId} - ${template.replace('_', ' ').toUpperCase()}`;
        }
      }

      // Use Supabase Edge Function instead of /api/send-email
      const { data: result, error } = await supabase.functions.invoke('send-email', {
        body: {
          to,
          subject,
          html: generateEmailHtml(template, data),
          from: from || 'noreply@whyteclub.com',
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send email');
      }

      return result;
    },
    onSuccess: (data) => {
      if (data.skipped) {
        toast({
          title: 'Email skipped',
          description: data.message,
        });
      } else {
        toast({
          title: 'Email sent successfully',
          description: 'The notification email has been sent.',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send email',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Helper function to generate email HTML
  const generateEmailHtml = (template: EmailTemplate, data: EmailData) => {
    const customerName = 'customerName' in data ? data.customerName : 'Customer';

    // Determine header title based on template type
    let headerTitle = 'Quote Update';
    if (
      [
        'ticket_created',
        'ticket_status_update',
        'ticket_reply',
        'ticket_closed',
        'admin_new_ticket',
        'admin_new_reply',
      ].includes(template)
    ) {
      headerTitle = 'Support Ticket Update';
    }

    const baseHtml = `
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">${headerTitle}</h2>
          <p>Dear ${customerName || 'Customer'},</p>
    `;

    let content = '';
    switch (template) {
      case 'quote_sent':
        if ('quoteId' in data) {
          content = `
            <p>Your quote has been sent for review.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Quote Details</h3>
              <p><strong>Quote ID:</strong> ${data.quoteId}</p>
              <p><strong>Total Amount:</strong> $${data.totalAmount || 'N/A'}</p>
              <p><strong>Currency:</strong> ${data.currency || 'USD'}</p>
            </div>
          `;
        }
        break;
      case 'quote_approved':
        if ('quoteId' in data) {
          content = `
            <p>Great news! Your quote has been approved.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Approved Quote</h3>
              <p><strong>Quote ID:</strong> ${data.quoteId}</p>
              <p><strong>Total Amount:</strong> $${data.totalAmount || 'N/A'}</p>
              <p><strong>Currency:</strong> ${data.currency || 'USD'}</p>
            </div>
          `;
        }
        break;
      case 'quote_rejected':
        if ('quoteId' in data) {
          content = `
            <p>We regret to inform you that your quote has been rejected.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Rejection Details</h3>
              <p><strong>Quote ID:</strong> ${data.quoteId}</p>
              <p><strong>Reason:</strong> ${data.rejectionReason || 'No reason provided'}</p>
            </div>
          `;
        }
        break;
      case 'order_shipped':
        if ('quoteId' in data) {
          content = `
            <p>Your order has been shipped!</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Shipping Details</h3>
              <p><strong>Quote ID:</strong> ${data.quoteId}</p>
              <p><strong>Tracking Number:</strong> ${data.trackingNumber || 'N/A'}</p>
              <p><strong>Carrier:</strong> ${data.carrier || 'N/A'}</p>
            </div>
          `;
        }
        break;
      case 'order_delivered':
        if ('quoteId' in data) {
          content = `
            <p>Your order has been delivered!</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Delivery Confirmation</h3>
              <p><strong>Quote ID:</strong> ${data.quoteId}</p>
            </div>
          `;
        }
        break;
      case 'bank_transfer_details':
        if ('quoteId' in data) {
          content = `
            <p>Thank you for your order! Please complete your payment using the bank details below:</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Order Details</h3>
              <p><strong>Order ID:</strong> ${data.quoteId}</p>
              <p><strong>Total Amount:</strong> ${data.totalAmount || 'N/A'} ${data.currency || 'USD'}</p>
            </div>
            
            <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #0284c7;">
              <h3 style="margin-top: 0; color: #0284c7;">Bank Account Details</h3>
              ${data.bankDetails || '<p>Bank details will be provided by our support team.</p>'}
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #f59e0b;">
              <h4 style="margin-top: 0; color: #d97706;">Important Instructions:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Please use your Order ID (${data.quoteId}) as the payment reference</li>
                <li>Send payment confirmation to support@iwishbag.com</li>
                <li>Your order will be processed once payment is confirmed</li>
              </ul>
            </div>
          `;
        }
        break;
      case 'password_reset':
        if ('resetLink' in data) {
          content = `
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.resetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #2563eb; font-size: 14px; word-break: break-all;">${data.resetLink}</p>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #f59e0b;">
              <p style="margin: 0; color: #d97706;"><strong>Security Notice:</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e;">
                <li>This link will expire in 24 hours</li>
                <li>If you didn't request a password reset, please ignore this email</li>
                <li>Your password won't be changed until you create a new one</li>
              </ul>
            </div>
          `;
        }
        break;
      case 'password_reset_success':
        content = `
          <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #10b981;">
            <h3 style="margin-top: 0; color: #065f46;">Password Reset Successful!</h3>
            <p style="color: #047857;">Your password has been successfully reset. You can now log in with your new password.</p>
          </div>
          
          <p>If you did not make this change, please contact our support team immediately at <a href="mailto:support@iwishbag.com">support@iwishbag.com</a>.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #374151;"><strong>Security Tips:</strong></p>
            <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #4b5563;">
              <li>Use a strong, unique password</li>
              <li>Enable two-factor authentication when available</li>
              <li>Never share your password with anyone</li>
            </ul>
          </div>
        `;
        break;
      case 'ticket_created':
        if ('ticketId' in data) {
          content = `
            <p>Thank you for contacting our support team. We have received your support ticket and will respond as soon as possible.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Ticket Details</h3>
              <p><strong>Ticket ID:</strong> #${data.ticketId.slice(0, 8)}</p>
              <p><strong>Subject:</strong> ${data.ticketSubject || 'Support Request'}</p>
              <p><strong>Category:</strong> ${data.ticketCategory || 'General'}</p>
              <p><strong>Status:</strong> Open</p>
            </div>
            <p>You can track the progress of your ticket by logging into your account. We'll notify you of any updates.</p>
          `;
        }
        break;
      case 'ticket_status_update':
        if ('ticketId' in data) {
          content = `
            <p>Your support ticket has been updated.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Updated Ticket</h3>
              <p><strong>Ticket ID:</strong> #${data.ticketId.slice(0, 8)}</p>
              <p><strong>Subject:</strong> ${data.ticketSubject || 'Support Request'}</p>
              <p><strong>New Status:</strong> <span style="background-color: #e0f2fe; padding: 2px 8px; border-radius: 4px; font-weight: bold;">${data.ticketStatus || 'Updated'}</span></p>
              ${data.assignedTo ? `<p><strong>Assigned to:</strong> ${data.assignedTo}</p>` : ''}
            </div>
            <p>You can view the full details by logging into your account and visiting the support section.</p>
          `;
        }
        break;
      case 'ticket_reply':
        if ('ticketId' in data) {
          content = `
            <p>You have received a new reply to your support ticket.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Ticket Reply</h3>
              <p><strong>Ticket ID:</strong> #${data.ticketId.slice(0, 8)}</p>
              <p><strong>Subject:</strong> ${data.ticketSubject || 'Support Request'}</p>
            </div>
            ${
              data.replyMessage
                ? `
            <div style="background-color: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <p style="margin: 0;"><strong>Reply:</strong></p>
              <p style="margin: 10px 0 0 0;">${data.replyMessage}</p>
            </div>
            `
                : ''
            }
            <p>You can reply to this message by logging into your account and visiting the support section.</p>
          `;
        }
        break;
      case 'ticket_closed':
        if ('ticketId' in data) {
          content = `
            <p>Your support ticket has been resolved and closed.</p>
            <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #10b981;">
              <h3 style="margin-top: 0; color: #065f46;">Ticket Resolved</h3>
              <p><strong>Ticket ID:</strong> #${data.ticketId.slice(0, 8)}</p>
              <p><strong>Subject:</strong> ${data.ticketSubject || 'Support Request'}</p>
              <p style="color: #047857;">Status: <strong>Closed</strong></p>
            </div>
            <p>If you need further assistance or have additional questions, please feel free to create a new support ticket.</p>
            <p>Thank you for contacting iwishBag support!</p>
          `;
        }
        break;
      case 'admin_new_ticket':
        if ('ticketId' in data) {
          content = `
            <p><strong>ADMIN NOTIFICATION:</strong> A new support ticket has been created and requires attention.</p>
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f59e0b;">
              <h3 style="margin-top: 0; color: #d97706;">New Ticket Details</h3>
              <p><strong>Ticket ID:</strong> #${data.ticketId.slice(0, 8)}</p>
              <p><strong>Subject:</strong> ${data.ticketSubject || 'Support Request'}</p>
              <p><strong>Customer:</strong> ${data.customerName || 'Unknown'}</p>
              <p><strong>Category:</strong> ${data.ticketCategory || 'General'}</p>
              <p><strong>Priority:</strong> ${data.priority || 'Normal'}</p>
              ${data.relatedOrderId ? `<p><strong>Related Order:</strong> ${data.relatedOrderId}</p>` : ''}
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${window.location.origin}/admin/support" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Admin Panel</a>
            </div>
            <p>Please review and assign this ticket as appropriate.</p>
          `;
        }
        break;
      case 'admin_new_reply':
        if ('ticketId' in data) {
          content = `
            <p><strong>ADMIN NOTIFICATION:</strong> A customer has replied to a support ticket.</p>
            <div style="background-color: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #0284c7;">
              <h3 style="margin-top: 0; color: #0284c7;">Customer Reply</h3>
              <p><strong>Ticket ID:</strong> #${data.ticketId.slice(0, 8)}</p>
              <p><strong>Subject:</strong> ${data.ticketSubject || 'Support Request'}</p>
              <p><strong>Customer:</strong> ${data.customerName || 'Unknown'}</p>
              ${data.assignedTo ? `<p><strong>Assigned to:</strong> ${data.assignedTo}</p>` : ''}
            </div>
            ${
              data.replyMessage
                ? `
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6b7280;">
              <p style="margin: 0;"><strong>Customer's Reply:</strong></p>
              <p style="margin: 10px 0 0 0;">${data.replyMessage}</p>
            </div>
            `
                : ''
            }
            <div style="text-align: center; margin: 30px 0;">
              <a href="${window.location.origin}/admin/support" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View and Respond</a>
            </div>
            <p>Please review and respond to the customer as soon as possible.</p>
          `;
        }
        break;
      case 'quote_verification_email':
        if ('quoteId' in data && 'verificationLink' in data) {
          content = `
            <p>Thank you for your interest in approving quote #${data.quoteId}. To complete the approval process, please verify your email address.</p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Quote Details</h3>
              <p><strong>Quote ID:</strong> ${data.quoteId}</p>
              <p><strong>Customer Email:</strong> ${data.customerEmail}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${data.verificationLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Verify Email & Approve Quote</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #2563eb; font-size: 14px; word-break: break-all;">${data.verificationLink}</p>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #f59e0b;">
              <p style="margin: 0; color: #d97706;"><strong>Important:</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; color: #92400e;">
                <li>This verification link will expire in ${data.expiryHours || 24} hours</li>
                <li>You must verify your email before you can approve the quote</li>
                <li>If you didn't request this quote, you can safely ignore this email</li>
              </ul>
            </div>
            
            <p>After verification, you'll be able to:</p>
            <ul>
              <li>Review complete quote details</li>
              <li>Approve or reject the quote</li>
              <li>Proceed to secure checkout if approved</li>
            </ul>
          `;
        }
        break;
      case 'quote_verification_success':
        if ('quoteId' in data) {
          content = `
            <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #10b981;">
              <h3 style="margin-top: 0; color: #065f46;">✓ Email Verified Successfully!</h3>
              <p style="color: #047857;">Your email has been verified and your quote has been approved.</p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Next Steps</h3>
              <p><strong>Quote ID:</strong> ${data.quoteId}</p>
              <p>Your quote is now approved and ready for checkout. You can:</p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Proceed to secure payment</li>
                <li>Review your order details</li>
                <li>Track your order status</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${window.location.origin}/quote/${data.quoteId}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Your Quote</a>
            </div>
            
            <p>Thank you for choosing iwishBag for your international shopping needs!</p>
          `;
        }
        break;
      default:
        content = `<p>You have received an update regarding your quote.</p>`;
    }

    return (
      baseHtml +
      content +
      `
          <p>Best regards,<br>The WishBag Team</p>
        </div>
      </body>
      </html>
    `
    );
  };

  // Predefined email notification functions
  const sendQuoteSentEmail = (quote: Quote) => {
    return sendEmailMutation.mutate({
      to: quote.email,
      template: 'quote_sent',
      data: {
        quoteId: quote.id,
        customerName: quote.customer_name,
        totalAmount: quote.total_amount,
        currency: quote.currency,
      },
    });
  };

  const sendQuoteApprovedEmail = (quote: Quote) => {
    return sendEmailMutation.mutate({
      to: quote.email,
      template: 'quote_approved',
      data: {
        quoteId: quote.id,
        customerName: quote.customer_name,
        totalAmount: quote.total_amount,
        currency: quote.currency,
      },
    });
  };

  const sendQuoteRejectedEmail = (quote: Quote, reason: string) => {
    return sendEmailMutation.mutate({
      to: quote.email,
      template: 'quote_rejected',
      data: {
        quoteId: quote.id,
        customerName: quote.customer_name,
        rejectionReason: reason,
      },
    });
  };

  const sendOrderShippedEmail = (
    quote: Quote,
    trackingInfo: { number: string; carrier: string },
  ) => {
    return sendEmailMutation.mutate({
      to: quote.email,
      template: 'order_shipped',
      data: {
        quoteId: quote.id,
        customerName: quote.customer_name,
        trackingNumber: trackingInfo.number,
        carrier: trackingInfo.carrier,
      },
    });
  };

  const sendOrderDeliveredEmail = (quote: Quote) => {
    return sendEmailMutation.mutate({
      to: quote.email,
      template: 'order_delivered',
      data: {
        quoteId: quote.id,
        customerName: quote.customer_name,
      },
    });
  };

  const sendContactFormEmail = (formData: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) => {
    return sendEmailMutation.mutate({
      to: formData.email,
      template: 'contact_form',
      data: formData,
    });
  };

  const sendBankTransferEmail = (quote: Quote, bankDetails: string) => {
    return sendEmailMutation.mutate({
      to: quote.email,
      template: 'bank_transfer_details',
      data: {
        quoteId: quote.display_id || quote.id,
        customerName: quote.customer_name,
        totalAmount: quote.final_total_usd?.toFixed(2) || '0.00',
        currency: quote.currency || 'USD',
        bankDetails: bankDetails,
      },
    });
  };

  const sendPasswordResetEmail = (email: string, resetLink: string) => {
    return sendEmailMutation.mutate({
      to: email,
      template: 'password_reset',
      data: {
        resetLink,
        customerName: email.split('@')[0], // Use email prefix as fallback name
      },
    });
  };

  const sendPasswordResetSuccessEmail = (email: string) => {
    return sendEmailMutation.mutate({
      to: email,
      template: 'password_reset_success',
      data: {
        customerName: email.split('@')[0], // Use email prefix as fallback name
      },
    });
  };

  const sendPaymentLinkEmail = async (options: {
    to: string;
    customerName: string;
    orderNumber: string;
    amount: number;
    currency: string;
    paymentUrl: string;
    expiryDate: string;
  }) => {
    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        throw new Error('User not authenticated - cannot send payment link email');
      }

      // Use the dedicated payment link email function
      const { data: result, error } = await supabase.functions.invoke('send-payment-link-email', {
        body: options,
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send payment link email');
      }

      toast({
        title: 'Payment link sent',
        description: `Payment link has been emailed to ${options.to}`,
      });

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Failed to send payment link',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Ticket notification functions
  const sendTicketCreatedEmail = (ticketData: {
    customerEmail: string;
    customerName: string;
    ticketId: string;
    subject: string;
    category: string;
  }) => {
    return sendEmailMutation.mutate({
      to: ticketData.customerEmail,
      template: 'ticket_created',
      data: {
        ticketId: ticketData.ticketId,
        ticketSubject: ticketData.subject,
        customerName: ticketData.customerName,
        ticketCategory: ticketData.category,
      },
    });
  };

  const sendTicketStatusUpdateEmail = (ticketData: {
    customerEmail: string;
    customerName: string;
    ticketId: string;
    subject: string;
    status: string;
    assignedTo?: string;
  }) => {
    return sendEmailMutation.mutate({
      to: ticketData.customerEmail,
      template: 'ticket_status_update',
      data: {
        ticketId: ticketData.ticketId,
        ticketSubject: ticketData.subject,
        customerName: ticketData.customerName,
        ticketStatus: ticketData.status,
        assignedTo: ticketData.assignedTo,
      },
    });
  };

  const sendTicketReplyEmail = (ticketData: {
    customerEmail: string;
    customerName: string;
    ticketId: string;
    subject: string;
    replyMessage?: string;
  }) => {
    return sendEmailMutation.mutate({
      to: ticketData.customerEmail,
      template: 'ticket_reply',
      data: {
        ticketId: ticketData.ticketId,
        ticketSubject: ticketData.subject,
        customerName: ticketData.customerName,
        replyMessage: ticketData.replyMessage,
      },
    });
  };

  const sendTicketClosedEmail = (ticketData: {
    customerEmail: string;
    customerName: string;
    ticketId: string;
    subject: string;
  }) => {
    return sendEmailMutation.mutate({
      to: ticketData.customerEmail,
      template: 'ticket_closed',
      data: {
        ticketId: ticketData.ticketId,
        ticketSubject: ticketData.subject,
        customerName: ticketData.customerName,
      },
    });
  };

  const sendAdminNewTicketEmail = (ticketData: {
    adminEmail: string;
    ticketId: string;
    subject: string;
    customerName: string;
    category: string;
    priority: string;
    relatedOrderId?: string;
  }) => {
    return sendEmailMutation.mutate({
      to: ticketData.adminEmail,
      template: 'admin_new_ticket',
      data: {
        ticketId: ticketData.ticketId,
        ticketSubject: ticketData.subject,
        customerName: ticketData.customerName,
        ticketCategory: ticketData.category,
        priority: ticketData.priority,
        relatedOrderId: ticketData.relatedOrderId,
      },
    });
  };

  const sendAdminNewReplyEmail = (ticketData: {
    adminEmail: string;
    ticketId: string;
    subject: string;
    customerName: string;
    replyMessage: string;
    assignedTo?: string;
  }) => {
    return sendEmailMutation.mutate({
      to: ticketData.adminEmail,
      template: 'admin_new_reply',
      data: {
        ticketId: ticketData.ticketId,
        ticketSubject: ticketData.subject,
        customerName: ticketData.customerName,
        replyMessage: ticketData.replyMessage,
        assignedTo: ticketData.assignedTo,
      },
    });
  };

  // Quote verification email functions
  const sendQuoteVerificationEmail = (verificationData: {
    to: string;
    quoteId: string;
    customerName: string;
    verificationLink: string;
    expiryHours?: number;
  }) => {
    return sendEmailMutation.mutate({
      to: verificationData.to,
      template: 'quote_verification_email',
      data: {
        quoteId: verificationData.quoteId,
        customerName: verificationData.customerName,
        customerEmail: verificationData.to,
        verificationLink: verificationData.verificationLink,
        expiryHours: verificationData.expiryHours || 24,
      },
    });
  };

  const sendQuoteVerificationSuccessEmail = (successData: {
    to: string;
    quoteId: string;
    customerName: string;
  }) => {
    return sendEmailMutation.mutate({
      to: successData.to,
      template: 'quote_verification_success',
      data: {
        quoteId: successData.quoteId,
        customerName: successData.customerName,
      },
    });
  };

  return {
    sendEmail: sendEmailMutation.mutate,
    isSending: sendEmailMutation.isPending,
    sendQuoteSentEmail,
    sendQuoteApprovedEmail,
    sendQuoteRejectedEmail,
    sendOrderShippedEmail,
    sendOrderDeliveredEmail,
    sendContactFormEmail,
    sendBankTransferEmail,
    sendPasswordResetEmail,
    sendPasswordResetSuccessEmail,
    sendPaymentLinkEmail,
    // Ticket notification functions
    sendTicketCreatedEmail,
    sendTicketStatusUpdateEmail,
    sendTicketReplyEmail,
    sendTicketClosedEmail,
    sendAdminNewTicketEmail,
    sendAdminNewReplyEmail,
    // Quote verification functions
    sendQuoteVerificationEmail,
    sendQuoteVerificationSuccessEmail,
  };
};
