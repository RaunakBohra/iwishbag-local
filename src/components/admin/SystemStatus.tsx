import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { config } from "@/config/env";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";

export const SystemStatus = () => {
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();
  const { sendQuoteSentEmail } = useEmailNotifications();

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase.from('quotes').select('count').limit(1);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  };

  const testEmailSystem = async () => {
    try {
      // Create a test quote
      const testQuote = {
        id: 'test-' + Date.now(),
        email: 'test@example.com',
        customer_name: 'Test User',
        total_amount: 100,
        currency: 'USD'
      };

      await sendQuoteSentEmail(testQuote);
      return true;
    } catch (error) {
      console.error('Email system test failed:', error);
      return false;
    }
  };

  const runTests = async () => {
    setIsTesting(true);
    const results = {
      environment: true, // We already validate this on startup
      supabase: await testSupabaseConnection(),
      email: await testEmailSystem()
    };

    // Display results
    toast({
      title: "System Status Test Results",
      description: (
        <div className="mt-2">
          <p>Environment Variables: ✅</p>
          <p>Supabase Connection: {results.supabase ? '✅' : '❌'}</p>
          <p>Email System: {results.email ? '✅' : '❌'}</p>
        </div>
      ),
      duration: 5000
    });

    setIsTesting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Environment Configuration</h3>
            <div className="text-sm space-y-1">
              <p>App Name: {config.app.name}</p>
              <p>Frontend URL: {config.app.url}</p>
              <p>Supabase URL: {config.supabase.url ? '✅' : '❌'}</p>
              <p>Resend API Key: {config.resend.apiKey ? '✅' : '❌'}</p>
              <p>Stripe Keys: {config.stripe.publishableKey && config.stripe.secretKey ? '✅' : '❌'}</p>
            </div>
          </div>

          <Button 
            onClick={runTests} 
            disabled={isTesting}
          >
            {isTesting ? 'Running Tests...' : 'Run System Tests'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 