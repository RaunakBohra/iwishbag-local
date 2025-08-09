import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { supabase } from '@/integrations/supabase/client';

interface QuoteSendEmailSimpleProps {
  quoteId: string;
  customerEmail?: string;
  customerName?: string;
  quoteStatus?: string;
  totalAmount?: number;
  currency?: string;
  isV2?: boolean;
  onEmailSent?: () => void;
}

export function QuoteSendEmailSimple({ 
  quoteId, 
  customerEmail,
  customerName,
  quoteStatus,
  totalAmount,
  currency = 'USD',
  isV2 = false,
  onEmailSent
}: QuoteSendEmailSimpleProps) {
  const [sending, setSending] = useState(false);
  const [quoteData, setQuoteData] = useState<any>(null);
  const { toast } = useToast();
  const { sendQuoteSentEmail, sendQuoteApprovedEmail } = useEmailNotifications();

  useEffect(() => {
    if (isV2 && quoteId) {
      fetchV2Quote();
    }
  }, [quoteId, isV2]);

  const fetchV2Quote = async () => {
    try {
      const { data, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error) throw error;
      setQuoteData(data);
    } catch (error) {
      console.error('Error fetching V2 quote:', error);
    }
  };

  const handleSendEmail = async () => {
    setSending(true);
    try {
      let emailData: any;
      let emailAddress: string;
      
      if (isV2 && quoteData) {
        // For V2 quotes, use the fetched data
        emailData = {
          id: quoteData.id,
          email: quoteData.customer_email,
          customer_name: quoteData.customer_name,
          total_amount: quoteData.total_quote_origincurrency || quoteData.total_quote_origincurrency,
          currency: quoteData.customer_currency,
          status: quoteData.status,
          share_token: quoteData.share_token,
          expires_at: quoteData.expires_at,
          // Also include the alternative field name for compatibility
          totalAmount: quoteData.total_quote_origincurrency || quoteData.total_quote_origincurrency,
          customerName: quoteData.customer_name,
          quoteId: quoteData.id
        };
        emailAddress = quoteData.customer_email;
      } else {
        // For V1 quotes, use the props
        emailData = {
          id: quoteId,
          email: customerEmail,
          customer_name: customerName || customerEmail?.split('@')[0],
          total_amount: totalAmount,
          currency: currency,
          status: quoteStatus
        };
        emailAddress = customerEmail || '';
      }

      if (emailData.status === 'approved' || emailData.status === 'calculated') {
        await sendQuoteApprovedEmail(emailData);
        toast({
          title: 'Quote email sent!',
          description: `Email sent to ${emailAddress}`,
        });
      } else {
        await sendQuoteSentEmail(emailData);
        toast({
          title: 'Quote email sent!',
          description: `Email sent to ${emailAddress}`,
        });
      }

      // Update V2 quote to mark email as sent
      if (isV2) {
        const { error: updateError } = await supabase
          .from('quotes_v2')
          .update({ 
            email_sent: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', quoteId);

        if (updateError) {
          console.error('Error updating V2 quote:', updateError);
        }
      }

      // Call the callback if provided
      if (onEmailSent) {
        onEmailSent();
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send email. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getButtonText = () => {
    if (sending) return 'Sending...';
    const status = isV2 ? quoteData?.status : quoteStatus;
    if (status === 'approved' || status === 'calculated') return 'Send Quote Email';
    return 'Send Quote Email';
  };

  const displayEmail = isV2 ? quoteData?.customer_email : customerEmail;
  const displayName = isV2 ? quoteData?.customer_name : customerName;
  const displayStatus = isV2 ? quoteData?.status : quoteStatus;

  // Don't render until V2 data is loaded
  if (isV2 && !quoteData) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading quote data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Send quote notifications to customer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <span className="font-medium">To:</span> {displayEmail}
            </p>
            {displayName && (
              <p className="text-sm">
                <span className="font-medium">Name:</span> {displayName}
              </p>
            )}
            <p className="text-sm">
              <span className="font-medium">Status:</span> {displayStatus}
            </p>
            {isV2 && quoteData?.share_token && (
              <p className="text-sm">
                <span className="font-medium">Share Link:</span> /quote/view/{quoteData.share_token}
              </p>
            )}
          </div>

          <Button 
            onClick={handleSendEmail}
            disabled={sending}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {getButtonText()}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Emails are sent via AWS SES
          </p>
        </div>
      </CardContent>
    </Card>
  );
}