import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Send, Bell, Eye, Copy, CheckCircle } from 'lucide-react';
import { QuoteEmailService } from '@/services/QuoteEmailService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface QuoteSendEmailProps {
  quoteId: string;
  customerEmail: string;
  shareToken: string;
  emailSent?: boolean;
  reminderCount?: number;
}

export function QuoteSendEmail({ 
  quoteId, 
  customerEmail, 
  shareToken,
  emailSent = false,
  reminderCount = 0
}: QuoteSendEmailProps) {
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const emailService = QuoteEmailService.getInstance();

  const shareUrl = `${window.location.origin}/quote/view/${shareToken}`;

  const handleSendEmail = async () => {
    setSending(true);
    try {
      const success = await emailService.sendQuoteEmail(quoteId);
      
      if (success) {
        toast({
          title: 'Quote sent!',
          description: `Email sent to ${customerEmail}`,
        });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send email. Check console for details.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendReminder = async () => {
    setSending(true);
    try {
      const success = await emailService.sendReminderEmail(quoteId);
      
      if (success) {
        toast({
          title: 'Reminder sent!',
          description: `Reminder #${reminderCount + 1} sent to ${customerEmail}`,
        });
      } else {
        throw new Error('Failed to send reminder');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Link copied!',
        description: 'Share link copied to clipboard',
      });
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  const handlePreviewEmail = async () => {
    // Open the share link in a new tab to preview
    window.open(shareUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Quote Delivery
        </CardTitle>
        <CardDescription>
          Send quote to customer via email with secure share link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Share Link */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium mb-2">Share Link:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background p-2 rounded border">
              {shareUrl}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={copyShareLink}
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Email Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div>
            <p className="text-sm font-medium">Email Status</p>
            <p className="text-sm text-muted-foreground">
              {emailSent ? 'Quote has been sent' : 'Quote not sent yet'}
            </p>
          </div>
          {emailSent && <CheckCircle className="h-5 w-5 text-green-600" />}
        </div>

        {/* Reminders */}
        {emailSent && (
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="text-sm font-medium">Reminders Sent</p>
              <p className="text-sm text-muted-foreground">
                {reminderCount > 0 ? `${reminderCount} reminder${reminderCount > 1 ? 's' : ''} sent` : 'No reminders sent'}
              </p>
            </div>
            <Badge variant="outline">{reminderCount}</Badge>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {!emailSent ? (
            <Button 
              onClick={handleSendEmail}
              disabled={sending}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Quote Email'}
            </Button>
          ) : (
            <Button 
              onClick={handleSendReminder}
              disabled={sending || reminderCount >= 3}
              variant="outline"
              className="w-full"
            >
              <Bell className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Reminder'}
            </Button>
          )}
          
          <Button 
            onClick={handlePreviewEmail}
            variant="ghost"
            className="w-full"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Quote Page
          </Button>
        </div>

        {/* Email Preview Note */}
        <div className="text-xs text-muted-foreground text-center">
          Note: In production, this will send actual emails. Currently logging to console.
        </div>
      </CardContent>
    </Card>
  );
}