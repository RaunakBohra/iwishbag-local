// Local testing version that logs emails instead of sending
import { QuoteEmailService } from './QuoteEmailService';
import { supabase } from '@/integrations/supabase/client';

export class QuoteEmailServiceLocal extends QuoteEmailService {
  async sendQuoteEmail(quoteId: string): Promise<boolean> {
    try {
      const quote = await this.getQuoteData(quoteId);
      if (!quote) return false;

      const shareUrl = this.getShareUrl(quote.share_token);
      
      console.log('=== QUOTE EMAIL (LOCAL TEST) ===');
      console.log('To:', quote.customer_email);
      console.log('Subject:', `Your Quote #${quote.quote_number || quote.id.slice(0, 8)} from iwishBag`);
      console.log('Share URL:', shareUrl);
      console.log('================================');
      
      // Still update the database
      await this.markQuoteAsSent(quoteId);
      
      return true;
    } catch (error) {
      console.error('Error in test email:', error);
      return false;
    }
  }

  async sendReminderEmail(quoteId: string): Promise<boolean> {
    try {
      const quote = await this.getQuoteData(quoteId);
      if (!quote) return false;

      const shareUrl = this.getShareUrl(quote.share_token);
      const reminderNumber = (quote.reminder_count || 0) + 1;
      
      console.log('=== REMINDER EMAIL (LOCAL TEST) ===');
      console.log('To:', quote.customer_email);
      console.log('Subject:', `Reminder: Your Quote #${quote.quote_number || quote.id.slice(0, 8)} is waiting`);
      console.log('Share URL:', shareUrl);
      console.log('Reminder #:', reminderNumber);
      console.log('===================================');
      
      // Still update the reminder count
      await this.updateReminderCount(quoteId);
      
      return true;
    } catch (error) {
      console.error('Error in test reminder:', error);
      return false;
    }
  }

  // Helper methods
  private async getQuoteData(quoteId: string) {
    const { data } = await supabase
      .from('quotes_v2')
      .select('*')
      .eq('id', quoteId)
      .single();
    return data;
  }

  private async markQuoteAsSent(quoteId: string) {
    await supabase
      .from('quotes_v2')
      .update({ 
        email_sent: true,
        sent_at: new Date().toISOString(),
        status: 'sent'
      })
      .eq('id', quoteId);
  }

  private async updateReminderCount(quoteId: string) {
    await supabase.rpc('send_quote_reminder', { quote_id: quoteId });
  }
}