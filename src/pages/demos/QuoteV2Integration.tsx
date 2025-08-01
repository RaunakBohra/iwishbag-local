import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuoteSendEmail } from '@/components/admin/QuoteSendEmail';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Users,
  Eye,
  Bell
} from 'lucide-react';

export default function QuoteV2Integration() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch recent quotes
      const { data: quotesData } = await supabase
        .from('quotes_v2')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setQuotes(quotesData || []);

      // Fetch stats
      const { data: activeQuotes } = await supabase
        .from('active_quotes')
        .select('id')
        .eq('is_active', true);

      const { data: sentQuotes } = await supabase
        .from('quotes_v2')
        .select('id')
        .eq('email_sent', true);

      const { data: viewedQuotes } = await supabase
        .from('quotes_v2')
        .select('id')
        .not('viewed_at', 'is', null);

      const { data: remindersData } = await supabase
        .from('quotes_v2')
        .select('reminder_count')
        .gt('reminder_count', 0);

      const totalReminders = remindersData?.reduce((sum, q) => sum + q.reminder_count, 0) || 0;

      setStats({
        total: quotesData?.length || 0,
        active: activeQuotes?.length || 0,
        sent: sentQuotes?.length || 0,
        viewed: viewedQuotes?.length || 0,
        reminders: totalReminders,
      });

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runDailyMaintenance = async () => {
    try {
      const { data, error } = await supabase.rpc('daily_quote_maintenance');
      if (error) throw error;
      
      alert(`Daily maintenance complete:\n${JSON.stringify(data, null, 2)}`);
      fetchData();
    } catch (error) {
      console.error('Error running maintenance:', error);
    }
  };

  const getQuotesNeedingReminders = async () => {
    try {
      const { data, error } = await supabase.rpc('get_quotes_needing_reminders');
      if (error) throw error;
      
      alert(`Quotes needing reminders: ${data?.length || 0}`);
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Quotes V2 Integration Dashboard</h1>
        <p className="text-muted-foreground">
          Complete implementation of share tokens, tracking, reminders, and automation
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Quotes</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold">{stats.sent}</p>
              </div>
              <Mail className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quotes Viewed</p>
                <p className="text-2xl font-bold">{stats.viewed}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reminders Sent</p>
                <p className="text-2xl font-bold">{stats.reminders}</p>
              </div>
              <Bell className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="quotes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quotes">Recent Quotes</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="integration">Integration Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>Recent Quotes with V2 Features</CardTitle>
              <CardDescription>
                Test email sending, view tracking, and reminders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quotes.map((quote) => (
                  <div key={quote.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold">
                          Quote #{quote.quote_number || quote.id.slice(0, 8)}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {quote.customer_name} ({quote.customer_email})
                        </p>
                      </div>
                      <Badge>{quote.status}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <QuoteSendEmail
                          quoteId={quote.id}
                          customerEmail={quote.customer_email}
                          shareToken={quote.share_token}
                          emailSent={quote.email_sent}
                          reminderCount={quote.reminder_count}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">Tracking Info</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Views: {quote.viewed_at ? '✅ Viewed' : '❌ Not viewed'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Expires: {quote.expires_at ? new Date(quote.expires_at).toLocaleDateString() : 'No expiry'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Version: {quote.version || 1}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation">
          <Card>
            <CardHeader>
              <CardTitle>Automation Tools</CardTitle>
              <CardDescription>
                Test automated functions for quotes management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Daily Maintenance</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Checks for expired quotes and identifies quotes needing reminders
                </p>
                <Button onClick={runDailyMaintenance}>
                  Run Daily Maintenance
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Reminder Check</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  See which quotes are eligible for reminders
                </p>
                <Button onClick={getQuotesNeedingReminders} variant="outline">
                  Check Reminder Queue
                </Button>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h3 className="font-semibold mb-2">Cron Job Setup</h3>
                <p className="text-sm mb-2">
                  In production, set up these cron jobs in Supabase Dashboard:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Daily at 9 AM: Run quote maintenance</li>
                  <li>Daily at 10 AM: Send reminder emails</li>
                  <li>Every hour: Check for expired quotes</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration">
          <Card>
            <CardHeader>
              <CardTitle>Integration Code Examples</CardTitle>
              <CardDescription>
                Copy these examples to integrate V2 features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">1. Send Quote with Share Link</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`import { QuoteEmailService } from '@/services/QuoteEmailService';

const emailService = QuoteEmailService.getInstance();
await emailService.sendQuoteEmail(quoteId);`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">2. Track Quote Views</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`// Automatically tracked when accessing via share token
// Or manually track:
await supabase.rpc('track_quote_view', { 
  quote_id: quoteId,
  token: shareToken 
});`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">3. Create Quote Revision</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`const { data: newQuoteId } = await supabase
  .rpc('create_quote_revision', {
    p_original_quote_id: quoteId,
    p_revision_reason: 'Customer requested changes'
  });`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">4. Check Active Quotes</h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`const { data: activeQuotes } = await supabase
  .from('active_quotes')
  .select('*')
  .eq('customer_id', userId);`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}