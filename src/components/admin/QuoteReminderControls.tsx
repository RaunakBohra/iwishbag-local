import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Mail, 
  Clock, 
  Send, 
  History,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface QuoteReminderControlsProps {
  quoteId: string;
  status: string;
  reminderCount: number;
  lastReminderAt: string | null;
  customerEmail: string;
  expiresAt: string | null;
  shareToken: string;
  onUpdate?: () => void;
}

export default function QuoteReminderControls({
  quoteId,
  status,
  reminderCount,
  lastReminderAt,
  customerEmail,
  expiresAt,
  shareToken,
  onUpdate
}: QuoteReminderControlsProps) {
  const [sendingManual, setSendingManual] = useState(false);
  const [disablingReminders, setDisablingReminders] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const canSendReminder = status === 'sent' && reminderCount < 3;
  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  const sendManualReminder = async () => {
    if (!canSendReminder) return;

    setSendingManual(true);
    try {
      // Call the reminder function directly
      const { error } = await supabase.rpc('send_quote_reminder', {
        quote_id: quoteId
      });

      if (error) throw error;

      // Send the actual email
      const shareUrl = `${window.location.origin}/quote/view/${shareToken}`;
      const { error: emailError } = await supabase.functions.invoke('send-email-ses', {
        body: {
          to: customerEmail,
          subject: `Reminder: Your Quote is waiting`,
          html: generateReminderEmailHtml(reminderCount + 1, shareUrl),
          from: 'iwishBag <noreply@mail.iwishbag.com>',
          replyTo: 'support@mail.iwishbag.com',
        }
      });

      if (emailError) throw emailError;

      toast({
        title: 'Success',
        description: 'Reminder sent successfully'
      });

      onUpdate?.();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: 'Error',
        description: 'Failed to send reminder',
        variant: 'destructive'
      });
    } finally {
      setSendingManual(false);
    }
  };

  const disableReminders = async () => {
    setDisablingReminders(true);
    try {
      // Set reminder count to max to prevent further reminders
      const { error } = await supabase
        .from('quotes_v2')
        .update({ reminder_count: 3 })
        .eq('id', quoteId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reminders disabled for this quote'
      });

      onUpdate?.();
    } catch (error) {
      console.error('Error disabling reminders:', error);
      toast({
        title: 'Error',
        description: 'Failed to disable reminders',
        variant: 'destructive'
      });
    } finally {
      setDisablingReminders(false);
    }
  };

  const generateReminderEmailHtml = (reminderNumber: number, shareUrl: string) => {
    const messages = [
      "Just a friendly reminder about your quote",
      "Your quote is still available",
      "Last reminder about your quote"
    ];

    const message = messages[Math.min(reminderNumber - 1, 2)];

    return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #d97706;">${message}</h1>
  <p>Your quote is still waiting for your review.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${shareUrl}" style="background: #d97706; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
      Review Your Quote
    </a>
  </div>
</body>
</html>`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Reminders
          </span>
          <Badge variant={canSendReminder ? 'default' : 'secondary'}>
            {reminderCount}/3 sent
          </Badge>
        </CardTitle>
        <CardDescription>
          Manage automated reminder emails for this quote
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Info */}
        <div className="space-y-2">
          {status !== 'sent' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Reminders are only sent for quotes with status "sent". Current status: {status}
              </AlertDescription>
            </Alert>
          )}

          {isExpired && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                This quote has expired. No reminders will be sent.
              </AlertDescription>
            </Alert>
          )}

          {reminderCount >= 3 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Maximum reminders (3) have been sent for this quote.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Last Reminder Info */}
        {lastReminderAt && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Last reminder sent</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {format(new Date(lastReminderAt), 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(lastReminderAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={sendManualReminder}
            disabled={!canSendReminder || sendingManual || isExpired}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendingManual ? 'Sending...' : 'Send Now'}
          </Button>

          {canSendReminder && (
            <Button
              onClick={disableReminders}
              disabled={disablingReminders}
              variant="outline"
              size="sm"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {disablingReminders ? 'Disabling...' : 'Disable Reminders'}
            </Button>
          )}
        </div>

        {/* Reminder History */}
        {reminderCount > 0 && (
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Reminder History
              </span>
              <span className="text-xs text-gray-500">{reminderCount} sent</span>
            </Button>

            {showHistory && (
              <div className="mt-2 space-y-2">
                {Array.from({ length: reminderCount }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <span>Reminder #{index + 1}</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}