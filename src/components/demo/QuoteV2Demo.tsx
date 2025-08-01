import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Share2, Eye, Bell, Clock, Copy, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { QuoteEmailServiceLocal } from '@/services/QuoteEmailServiceLocal';

export function QuoteV2Demo() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const { toast } = useToast();
  const emailService = new QuoteEmailServiceLocal();

  // Fetch quotes
  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch quotes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  // Generate share link
  const generateShareLink = async (quote: any) => {
    try {
      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/quote/view/${quote.share_token}`;
      
      await navigator.clipboard.writeText(shareUrl);
      setLastAction(`Share link copied: ${shareUrl}`);
      toast({
        title: 'Share link copied!',
        description: shareUrl,
      });
    } catch (error) {
      console.error('Error generating share link:', error);
    }
  };

  // Track view
  const trackView = async (quoteId: string, shareToken: string) => {
    try {
      const { data, error } = await supabase
        .rpc('track_quote_view', { 
          quote_id: quoteId,
          token: shareToken 
        });

      if (error) throw error;
      
      const viewTime = new Date().toLocaleString();
      setLastAction(`View tracked at ${viewTime}`);
      toast({
        title: 'View tracked',
        description: `Quote viewed at ${viewTime}`,
      });
      
      fetchQuotes(); // Refresh to show updated viewed_at
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  // Send reminder
  const sendReminder = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('send_quote_reminder', { quote_id: quoteId });

      if (error) throw error;
      
      setLastAction(`Reminder sent! This would trigger an email to the customer.`);
      toast({
        title: 'Reminder sent',
        description: `Reminder count incremented`,
      });
      
      fetchQuotes(); // Refresh to show updated reminder count
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  // Send quote (change status to sent)
  const sendQuote = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .from('quotes_v2')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          email_sent: true
        })
        .eq('id', quoteId)
        .select()
        .single();

      if (error) throw error;
      
      setLastAction(`Quote sent! Status changed to 'sent'. Reminder button is now enabled.`);
      toast({
        title: 'Quote sent',
        description: 'Status changed to sent',
      });
      
      fetchQuotes();
    } catch (error) {
      console.error('Error sending quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to send quote',
        variant: 'destructive',
      });
    }
  };

  // Test email (using local service)
  const testEmail = async (quoteId: string) => {
    try {
      const success = await emailService.sendQuoteEmail(quoteId);
      
      if (success) {
        setLastAction(`Email test successful! Check console for email preview.`);
        toast({
          title: 'Email test complete',
          description: 'Check console for email preview',
        });
      } else {
        throw new Error('Email test failed');
      }
    } catch (error) {
      console.error('Error testing email:', error);
      toast({
        title: 'Error',
        description: 'Failed to test email',
        variant: 'destructive',
      });
    }
  };

  // Create revision
  const createRevision = async (quoteId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('create_quote_revision', {
          p_original_quote_id: quoteId,
          p_revision_reason: 'Testing revision system',
        });

      if (error) throw error;
      
      setLastAction(`New version created with ID: ${data}. Check the database to see the version history.`);
      toast({
        title: 'Revision created',
        description: `New revision ID: ${data}`,
      });
      
      fetchQuotes();
    } catch (error) {
      console.error('Error creating revision:', error);
    }
  };

  // Create test quote
  const createTestQuote = async () => {
    try {
      const testData = {
        customer_email: 'rnkbohra@gmail.com',
        customer_name: 'Test Customer',
        status: 'sent', // Set to 'sent' so reminder button works
        origin_country: 'US',
        destination_country: 'IN',
        items: [{
          id: crypto.randomUUID(),
          name: 'Test Product',
          quantity: 1,
          costprice_origin: 100,
          weight: 0.5,
        }],
        validity_days: 7,
        customer_message: 'This is a test quote with V2 features',
        payment_terms: '50% advance, 50% on delivery',
      };

      const { data, error } = await supabase
        .from('quotes_v2')
        .insert(testData)
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: 'Test quote created',
        description: `Quote ID: ${data.id}`,
      });
      
      fetchQuotes();
    } catch (error) {
      console.error('Error creating test quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to create test quote',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quotes V2 System Demo</CardTitle>
          <CardDescription>
            Test the new quote features: share tokens, view tracking, reminders, and version control
          </CardDescription>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🎯 How to Test:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
              <li>Click "Create Test Quote" to generate a new quote</li>
              <li>Click "Share" to copy the public share link</li>
              <li>Click "Track View" to simulate a customer viewing the quote</li>
              <li>Click "Reminder" to increment the reminder count</li>
              <li>Click "New Version" to create a revision</li>
            </ol>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={createTestQuote} className="mb-4">
            Create Test Quote
          </Button>
          
          <div className="space-y-4">
            {loading ? (
              <p>Loading quotes...</p>
            ) : quotes.length === 0 ? (
              <p>No quotes found. Create a test quote to start.</p>
            ) : (
              quotes.map((quote) => (
                <Card key={quote.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">
                          {quote.quote_number || `Quote ${quote.id.slice(0, 8)}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {quote.customer_name} ({quote.customer_email})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          Status: <span className={`font-semibold ${
                            quote.status === 'sent' ? 'text-blue-600' : 
                            quote.status === 'draft' ? 'text-gray-600' : 
                            quote.status === 'approved' ? 'text-green-600' : 
                            'text-primary'
                          }`}>{quote.status}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Version {quote.version || 1}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <strong>Share Token:</strong> 
                        <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">{quote.share_token}</code>
                      </div>
                      <div>
                        <strong>Validity:</strong> {quote.validity_days} days
                      </div>
                      <div>
                        <strong>Email Sent:</strong> {quote.email_sent ? '✅ Yes' : '❌ No'}
                      </div>
                      <div className="flex items-center gap-1">
                        <strong>Reminders Sent:</strong> 
                        <span className="bg-orange-100 dark:bg-orange-900 px-2 py-0.5 rounded-full text-xs font-medium">
                          {quote.reminder_count || 0}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <strong>Last Viewed:</strong> 
                        <span className={quote.viewed_at ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}>
                          {quote.viewed_at ? ` ${new Date(quote.viewed_at).toLocaleString()}` : ' Never viewed'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <strong>Expires:</strong> 
                        <span className={quote.expires_at && new Date(quote.expires_at) < new Date() ? 'text-red-600' : 'text-gray-600'}>
                          {quote.expires_at ? ` ${new Date(quote.expires_at).toLocaleString()}` : ' No expiry set'}
                        </span>
                      </div>
                    </div>
                    
                    {quote.customer_message && (
                      <div className="p-2 bg-muted rounded">
                        <p className="text-sm">{quote.customer_message}</p>
                      </div>
                    )}
                    
                    <div className="flex gap-2 pt-2">
                      {quote.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => sendQuote(quote.id)}
                          title="Change status to sent"
                        >
                          Send Quote
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateShareLink(quote)}
                        title="Copy public share link"
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        Share
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => trackView(quote.id, quote.share_token)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Track View
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => sendReminder(quote.id)}
                        disabled={quote.status !== 'sent'}
                        title={quote.status !== 'sent' ? 'Quote must be sent first' : 'Send reminder'}
                      >
                        <Bell className="w-4 h-4 mr-1" />
                        Reminder
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => createRevision(quote.id)}
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        New Version
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testEmail(quote.id)}
                        title="Test email locally (console log)"
                      >
                        <Mail className="w-4 h-4 mr-1" />
                        Test Email
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
          
          {lastAction && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">🎆 Last Action Result:</h3>
              <p className="text-sm text-green-800 dark:text-green-200">{lastAction}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}