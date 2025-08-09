/**
 * Email Recovery Service
 * 
 * Handles email templates and delivery for cart abandonment recovery.
 * Integrates with Resend API for email delivery.
 */

import { logger } from '@/utils/logger';

interface CartItem {
  quote: {
    id: string;
    total_quote_origincurrency: number;
    destination_country: string;
    customer_data?: {
      description?: string;
    };
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class EmailRecoveryService {
  private static instance: EmailRecoveryService;
  
  static getInstance(): EmailRecoveryService {
    if (!EmailRecoveryService.instance) {
      EmailRecoveryService.instance = new EmailRecoveryService();
    }
    return EmailRecoveryService.instance;
  }

  /**
   * Get email template for specific recovery stage
   */
  getTemplate(
    templateId: string,
    cartItems: CartItem[],
    cartValue: number,
    currency: string,
    incentive: string = 'none'
  ): EmailTemplate {
    const itemCount = cartItems.length;
    const formattedValue = this.formatCurrency(cartValue, currency);
    const incentiveText = this.getIncentiveText(incentive);
    const recoveryLink = `${window.location.origin}/cart?recovery=true`;

    switch (templateId) {
      case 'cart_reminder_1h':
        return this.getOneHourTemplate(itemCount, formattedValue, recoveryLink);
      
      case 'cart_reminder_24h':
        return this.get24HourTemplate(itemCount, formattedValue, recoveryLink, incentiveText);
      
      case 'cart_reminder_72h':
        return this.get72HourTemplate(itemCount, formattedValue, recoveryLink, incentiveText);
      
      default:
        return this.getGenericTemplate(itemCount, formattedValue, recoveryLink);
    }
  }

  /**
   * 1 Hour Reminder - Gentle reminder
   */
  private getOneHourTemplate(itemCount: number, value: string, link: string): EmailTemplate {
    const subject = 'Don\'t forget your items at iwishBag!';
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Don't forget your cart</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0D9488, #14B8A6); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px 20px; border: 1px solid #e5e5e5; }
            .button { display: inline-block; background: #0D9488; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #0F766E; }
            .items-summary { background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #666; border-radius: 0 0 8px 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🛒 Your items are waiting!</h1>
                <p>Complete your international shopping order</p>
            </div>
            
            <div class="content">
                <p>Hi there!</p>
                
                <p>You left ${itemCount} ${itemCount === 1 ? 'item' : 'items'} in your cart at iwishBag. Your international shopping items are reserved and ready to ship!</p>
                
                <div class="items-summary">
                    <h3>Cart Summary</h3>
                    <p><strong>${itemCount} ${itemCount === 1 ? 'item' : 'items'}</strong> • <strong>Total: ${value}</strong></p>
                    <p>✈️ International shipping from US, UK, and more</p>
                    <p>🚚 Door-to-door delivery to India & Nepal</p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${link}" class="button">Complete Your Order</a>
                </div>
                
                <p>Why choose iwishBag?</p>
                <ul>
                    <li>✅ Best prices from international brands</li>
                    <li>✅ Secure payment options (PayU, Stripe)</li>
                    <li>✅ Fast & reliable shipping</li>
                    <li>✅ 24/7 customer support</li>
                </ul>
                
                <p>Need help? Reply to this email or visit our <a href="${window.location.origin}/help">Help Center</a>.</p>
            </div>
            
            <div class="footer">
                <p>iwishBag - Your International Shopping Partner</p>
                <p>Making global brands accessible to India & Nepal</p>
            </div>
        </div>
    </body>
    </html>`;

    const text = `
Don't forget your items at iwishBag!

Hi there!

You left ${itemCount} ${itemCount === 1 ? 'item' : 'items'} in your cart at iwishBag. Your international shopping items are reserved and ready to ship!

Cart Summary:
• ${itemCount} ${itemCount === 1 ? 'item' : 'items'}
• Total: ${value}
• International shipping from US, UK, and more
• Door-to-door delivery to India & Nepal

Complete your order: ${link}

Why choose iwishBag?
✅ Best prices from international brands
✅ Secure payment options (PayU, Stripe)  
✅ Fast & reliable shipping
✅ 24/7 customer support

Need help? Reply to this email or visit our Help Center.

iwishBag - Your International Shopping Partner
Making global brands accessible to India & Nepal
    `;

    return { subject, html, text };
  }

  /**
   * 24 Hour Reminder - With discount incentive
   */
  private get24HourTemplate(itemCount: number, value: string, link: string, incentive: string): EmailTemplate {
    const subject = '🎁 5% OFF your iwishBag order - Complete today!';
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>5% OFF Your Order</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #DC2626, #EF4444); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px 20px; border: 1px solid #e5e5e5; }
            .discount-badge { background: #FEF3C7; border: 2px dashed #F59E0B; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .discount-code { background: #F59E0B; color: white; padding: 10px 20px; border-radius: 4px; font-weight: bold; font-size: 18px; letter-spacing: 1px; }
            .button { display: inline-block; background: #DC2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #666; border-radius: 0 0 8px 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎁 Special offer just for you!</h1>
                <p>5% OFF your international shopping order</p>
            </div>
            
            <div class="content">
                <p>Hi!</p>
                
                <p>We noticed you didn't complete your order yesterday. As a thank you for choosing iwishBag, here's an exclusive 5% discount!</p>
                
                <div class="discount-badge">
                    <h2>🎉 LIMITED TIME OFFER</h2>
                    <p>Get 5% OFF your entire order</p>
                    <div class="discount-code">SAVE5NOW</div>
                    <p><small>Valid for 48 hours</small></p>
                </div>
                
                <p><strong>Your Cart (${itemCount} ${itemCount === 1 ? 'item' : 'items'}, ${value}):</strong></p>
                <p>💰 Your savings with 5% OFF: <strong>${this.calculateDiscount(value, 5)}</strong></p>
                
                <div style="text-align: center;">
                    <a href="${link}&discount=SAVE5NOW" class="button">Apply Discount & Complete Order</a>
                </div>
                
                <p><strong>⏰ Don't miss out!</strong> This offer expires in 48 hours and your cart items may go out of stock.</p>
                
                <p>Questions? Our customer support team is here to help 24/7.</p>
            </div>
            
            <div class="footer">
                <p>iwishBag - International Shopping Made Easy</p>
                <p>Trusted by thousands of customers across India & Nepal</p>
            </div>
        </div>
    </body>
    </html>`;

    const text = `
🎁 Special offer just for you! 5% OFF your international shopping order

Hi!

We noticed you didn't complete your order yesterday. As a thank you for choosing iwishBag, here's an exclusive 5% discount!

🎉 LIMITED TIME OFFER
Get 5% OFF your entire order
Code: SAVE5NOW
(Valid for 48 hours)

Your Cart: ${itemCount} ${itemCount === 1 ? 'item' : 'items'}, ${value}
Your savings with 5% OFF: ${this.calculateDiscount(value, 5)}

Complete your order with discount: ${link}&discount=SAVE5NOW

⏰ Don't miss out! This offer expires in 48 hours and your cart items may go out of stock.

Questions? Our customer support team is here to help 24/7.

iwishBag - International Shopping Made Easy
Trusted by thousands of customers across India & Nepal
    `;

    return { subject, html, text };
  }

  /**
   * 72 Hour Reminder - Final attempt with free shipping
   */
  private get72HourTemplate(itemCount: number, value: string, link: string, incentive: string): EmailTemplate {
    const subject = '🚚 FREE SHIPPING on your iwishBag order - Last chance!';
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-case=1.0">
        <title>FREE SHIPPING - Last Chance</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #7C3AED, #8B5CF6); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px 20px; border: 1px solid #e5e5e5; }
            .shipping-badge { background: #F0FDF4; border: 2px solid #22C55E; padding: 25px; text-align: center; border-radius: 8px; margin: 20px 0; }
            .free-shipping { background: #22C55E; color: white; padding: 12px 25px; border-radius: 4px; font-weight: bold; font-size: 20px; }
            .button { display: inline-block; background: #7C3AED; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .urgency { background: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #666; border-radius: 0 0 8px 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚚 Last chance for FREE SHIPPING!</h1>
                <p>Your international shopping cart is about to expire</p>
            </div>
            
            <div class="content">
                <p>Hi!</p>
                
                <p>This is your final reminder - your iwishBag cart with ${itemCount} ${itemCount === 1 ? 'item' : 'items'} (${value}) is about to expire.</p>
                
                <div class="shipping-badge">
                    <h2>🎊 FINAL OFFER</h2>
                    <div class="free-shipping">FREE SHIPPING</div>
                    <p>No minimum order • All destinations</p>
                    <p><small>Expires in 24 hours</small></p>
                </div>
                
                <div class="urgency">
                    <h3>⚠️ Urgent: Your items may sell out</h3>
                    <p>International products have limited stock. Complete your order now to secure these items.</p>
                </div>
                
                <div style="text-align: center;">
                    <a href="${link}&shipping=free" class="button">Get FREE SHIPPING - Complete Order</a>
                </div>
                
                <p><strong>What you'll miss if you wait:</strong></p>
                <ul>
                    <li>❌ FREE shipping (save ₹500-2000)</li>
                    <li>❌ These specific products may go out of stock</li>
                    <li>❌ Current exchange rates (prices may increase)</li>
                </ul>
                
                <p>After 24 hours, your cart will be permanently cleared and this offer will expire.</p>
                
                <p>Need help deciding? Our experts are available 24/7 to assist you.</p>
            </div>
            
            <div class="footer">
                <p>iwishBag - Don't let your dream products slip away</p>
                <p>This is our final reminder for this cart</p>
            </div>
        </div>
    </body>
    </html>`;

    const text = `
🚚 Last chance for FREE SHIPPING!

Hi!

This is your final reminder - your iwishBag cart with ${itemCount} ${itemCount === 1 ? 'item' : 'items'} (${value}) is about to expire.

🎊 FINAL OFFER - FREE SHIPPING
No minimum order • All destinations
Expires in 24 hours

⚠️ Urgent: Your items may sell out
International products have limited stock. Complete your order now to secure these items.

Get FREE SHIPPING: ${link}&shipping=free

What you'll miss if you wait:
❌ FREE shipping (save ₹500-2000)
❌ These specific products may go out of stock  
❌ Current exchange rates (prices may increase)

After 24 hours, your cart will be permanently cleared and this offer will expire.

Need help deciding? Our experts are available 24/7 to assist you.

iwishBag - Don't let your dream products slip away
This is our final reminder for this cart
    `;

    return { subject, html, text };
  }

  /**
   * Generic template fallback
   */
  private getGenericTemplate(itemCount: number, value: string, link: string): EmailTemplate {
    return this.getOneHourTemplate(itemCount, value, link);
  }

  /**
   * Get incentive text based on incentive type
   */
  private getIncentiveText(incentive: string): string {
    switch (incentive) {
      case '5_percent_off':
        return '5% OFF with code SAVE5NOW';
      case 'free_shipping':
        return 'FREE SHIPPING on your order';
      case '10_percent_off':
        return '10% OFF with code SAVE10NOW';
      default:
        return '';
    }
  }

  /**
   * Format currency value
   */
  private formatCurrency(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency === 'NPR' ? 'NPR' : 'INR',
      }).format(amount);
    } catch {
      return `${currency === 'NPR' ? 'Rs.' : '₹'} ${amount.toLocaleString()}`;
    }
  }

  /**
   * Calculate discount amount
   */
  private calculateDiscount(value: string, percentage: number): string {
    try {
      // Extract numeric value from formatted string
      const numericValue = parseFloat(value.replace(/[^\d.]/g, ''));
      const discountAmount = numericValue * (percentage / 100);
      const currency = value.includes('Rs.') ? 'NPR' : 'INR';
      return this.formatCurrency(discountAmount, currency);
    } catch {
      return 'Savings applied at checkout';
    }
  }

  /**
   * Send email using Resend API (to be implemented)
   */
  async sendRecoveryEmail(
    to: string,
    templateId: string,
    cartItems: CartItem[],
    cartValue: number,
    currency: string,
    incentive: string = 'none'
  ): Promise<boolean> {
    try {
      const template = this.getTemplate(templateId, cartItems, cartValue, currency, incentive);
      
      // TODO: Implement actual email sending via Resend
      logger.info('Sending cart recovery email:', {
        to,
        subject: template.subject,
        templateId,
        incentive
      });

      // For now, just log the email content (remove in production)
      if (import.meta.env.DEV) {
        console.log('Email Template:', template);
      }

      return true;
    } catch (error) {
      logger.error('Failed to send recovery email:', error);
      return false;
    }
  }
}

export const emailRecoveryService = EmailRecoveryService.getInstance();
export default EmailRecoveryService;