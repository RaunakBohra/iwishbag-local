import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function TestEmail() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    to: '',
    subject: 'Test Email from iwishBag',
    html: '<h1>Test Email</h1><p>This is a test email from iwishBag system.</p>',
    from: 'noreply@whyteclub.com'
  });

  const testEmailFunction = async () => {
    setIsLoading(true);
    
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Not authenticated",
          description: "You need to be logged in to test email functionality",
          variant: "destructive"
        });
        return;
      }

      console.log('Testing email function with:', formData);
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: formData,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('Edge Function response:', { data, error });

      if (error) {
        throw new Error(error.message || 'Failed to send email');
      }

      toast({
        title: "Email sent successfully!",
        description: "Check your email inbox and the browser console for details.",
      });
      
    } catch (error: any) {
      console.error('Email test error:', error);
      toast({
        title: "Email test failed",
        description: error.message || 'An error occurred while sending the test email',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectResendAPI = async () => {
    setIsLoading(true);
    
    try {
      // This tests the Resend API directly from the browser
      // Note: This should only be used for testing as it exposes the API key
      
      const resendApiKey = prompt('Enter your Resend API key (for testing only):');
      if (!resendApiKey) return;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: formData.from,
          to: formData.to,
          subject: formData.subject + ' (Direct API Test)',
          html: formData.html,
        }),
      });

      const result = await response.json();
      console.log('Direct Resend API response:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Failed to send email via Resend API');
      }

      toast({
        title: "Direct API test successful!",
        description: "Email sent directly via Resend API.",
      });
      
    } catch (error: any) {
      console.error('Direct API test error:', error);
      toast({
        title: "Direct API test failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Email System Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="to">To Email</Label>
            <Input
              id="to"
              type="email"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              placeholder="recipient@example.com"
            />
          </div>
          
          <div>
            <Label htmlFor="from">From Email</Label>
            <Input
              id="from"
              type="email"
              value={formData.from}
              onChange={(e) => setFormData({ ...formData, from: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="html">HTML Content</Label>
            <Textarea
              id="html"
              value={formData.html}
              onChange={(e) => setFormData({ ...formData, html: e.target.value })}
              rows={5}
            />
          </div>
          
          <div className="space-y-2">
            <Button 
              onClick={testEmailFunction} 
              disabled={isLoading || !formData.to}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Test Edge Function Email'
              )}
            </Button>
            
            <Button 
              onClick={testDirectResendAPI} 
              disabled={isLoading || !formData.to}
              variant="outline"
              className="w-full"
            >
              Test Direct Resend API (Debug Only)
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
            <p className="font-semibold mb-2">Debug Steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open browser console (F12) to see detailed logs</li>
              <li>Make sure you're logged in as an admin</li>
              <li>Enter a valid email address to receive the test</li>
              <li>Click "Test Edge Function Email" first</li>
              <li>Check console for any errors</li>
              <li>If Edge Function fails, try "Test Direct Resend API" to verify API key</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}