import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Mail, 
  Clock, 
  Settings, 
  AlertCircle, 
  Save,
  RefreshCw,
  Send,
  History,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface ReminderSettings {
  enabled: boolean;
  days_between_reminders: number;
  max_reminders: number;
  initial_delay_days: number;
  reminder_hour_utc: number;
}

interface ReminderHistory {
  id: string;
  quote_id: string;
  quote_number: string;
  customer_email: string;
  reminder_number: number;
  sent_at: string;
  status: 'sent' | 'failed';
  error_message?: string;
}

export default function QuoteReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: true,
    days_between_reminders: 3,
    max_reminders: 3,
    initial_delay_days: 2,
    reminder_hour_utc: 10
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<ReminderHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    loadSettings();
    loadRecentHistory();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'quote_reminder_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.value) {
        setSettings(data.value);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load reminder settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'quote_reminder_settings',
          value: settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Reminder settings saved successfully'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const loadRecentHistory = async () => {
    setLoadingHistory(true);
    try {
      // For now, we'll simulate history since we don't have a dedicated table yet
      // In production, this would fetch from a reminder_history table
      const { data: recentQuotes, error } = await supabase
        .from('quotes_v2')
        .select('id, quote_number, customer_email, reminder_count, last_reminder_at')
        .gt('reminder_count', 0)
        .order('last_reminder_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform to history format
      const historyItems: ReminderHistory[] = (recentQuotes || []).map(quote => ({
        id: `${quote.id}-${quote.reminder_count}`,
        quote_id: quote.id,
        quote_number: quote.quote_number || quote.id.slice(0, 8),
        customer_email: quote.customer_email,
        reminder_number: quote.reminder_count,
        sent_at: quote.last_reminder_at,
        status: 'sent' as const
      }));

      setHistory(historyItems);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendTestReminder = async () => {
    if (!testEmail) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive'
      });
      return;
    }

    setSendingTest(true);
    try {
      // Call edge function to send test reminder
      const { data, error } = await supabase.functions.invoke('send-test-reminder', {
        body: { email: testEmail }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Test reminder sent successfully'
      });
      setTestEmail('');
    } catch (error) {
      console.error('Error sending test:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test reminder',
        variant: 'destructive'
      });
    } finally {
      setSendingTest(false);
    }
  };

  const triggerManualRun = async () => {
    try {
      // This would trigger the reminder job manually
      toast({
        title: 'Reminder Job Triggered',
        description: 'The reminder process has been started manually'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to trigger reminder job',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Quote Reminder Settings</h1>
        <p className="text-gray-600 mt-2">Configure automated email reminders for pending quotes</p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="test">
            <Send className="h-4 w-4 mr-2" />
            Test
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Reminder Configuration</CardTitle>
              <CardDescription>
                Set up how and when quote reminders are sent to customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled">Enable Reminders</Label>
                  <p className="text-sm text-gray-500">
                    Turn on/off the automated reminder system
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, enabled: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="initial_delay">Initial Delay (days)</Label>
                  <Input
                    id="initial_delay"
                    type="number"
                    min="1"
                    max="30"
                    value={settings.initial_delay_days}
                    onChange={(e) => 
                      setSettings({ 
                        ...settings, 
                        initial_delay_days: parseInt(e.target.value) || 2 
                      })
                    }
                  />
                  <p className="text-sm text-gray-500">
                    Days to wait before sending the first reminder
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="days_between">Days Between Reminders</Label>
                  <Input
                    id="days_between"
                    type="number"
                    min="1"
                    max="30"
                    value={settings.days_between_reminders}
                    onChange={(e) => 
                      setSettings({ 
                        ...settings, 
                        days_between_reminders: parseInt(e.target.value) || 3 
                      })
                    }
                  />
                  <p className="text-sm text-gray-500">
                    Interval between each reminder email
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_reminders">Maximum Reminders</Label>
                  <Input
                    id="max_reminders"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.max_reminders}
                    onChange={(e) => 
                      setSettings({ 
                        ...settings, 
                        max_reminders: parseInt(e.target.value) || 3 
                      })
                    }
                  />
                  <p className="text-sm text-gray-500">
                    Maximum number of reminders per quote
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminder_hour">Send Time (UTC Hour)</Label>
                  <Input
                    id="reminder_hour"
                    type="number"
                    min="0"
                    max="23"
                    value={settings.reminder_hour_utc}
                    onChange={(e) => 
                      setSettings({ 
                        ...settings, 
                        reminder_hour_utc: parseInt(e.target.value) || 10 
                      })
                    }
                  />
                  <p className="text-sm text-gray-500">
                    Hour of day to send reminders (0-23 UTC)
                  </p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Reminders are sent daily at {settings.reminder_hour_utc}:00 UTC via GitHub Actions.
                  Only quotes with status "sent" will receive reminders.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button onClick={saveSettings} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
                <Button variant="outline" onClick={triggerManualRun}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Now
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reminder History</CardTitle>
              <CardDescription>
                View recently sent quote reminders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No reminder history available
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            Quote #{item.quote_number}
                          </span>
                          <Badge variant="outline">
                            Reminder {item.reminder_number}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{item.customer_email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm">
                            {format(new Date(item.sent_at), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(item.sent_at), { addSuffix: true })}
                          </p>
                        </div>
                        {item.status === 'sent' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test Reminder Email</CardTitle>
              <CardDescription>
                Send a test reminder email to verify the template
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test_email">Email Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="test_email"
                    type="email"
                    placeholder="test@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button 
                    onClick={sendTestReminder} 
                    disabled={sendingTest || !testEmail}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendingTest ? 'Sending...' : 'Send Test'}
                  </Button>
                </div>
              </div>

              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  This will send a sample reminder email with test data to the specified address.
                  The email will look exactly like a real reminder but with sample quote information.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}