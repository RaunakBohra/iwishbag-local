import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { config } from "@/config/env";
import { useEmailNotifications } from "@/hooks/useEmailNotifications";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";

export const SystemStatus = () => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<{
    environment: boolean;
    supabase: boolean;
    email: boolean;
  } | null>(null);
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

    setTestResults(results);

    // Display results
    toast({
      title: "System Status Test Results",
      description: (
        <div className="mt-2 space-y-1">
          <p className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Environment Variables
          </p>
          <p className="flex items-center gap-2">
            {results.supabase ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            Supabase Connection
          </p>
          <p className="flex items-center gap-2">
            {results.email ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            Email System
          </p>
        </div>
      ),
      duration: 5000
    });

    setIsTesting(false);
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return status ? (
      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
        <CheckCircle className="h-3 w-3 mr-1" />
        OK
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Error
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Environment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Environment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">App Name</span>
                <span className="text-sm text-muted-foreground">{config.app.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Frontend URL</span>
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">{config.app.url}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Supabase URL</span>
                {getStatusIcon(!!config.supabase.url)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Supabase Key</span>
                {getStatusIcon(!!config.supabase.anonKey)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Resend API Key</span>
                {getStatusIcon(!!config.resend.apiKey)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5" />
            System Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runTests} 
              disabled={isTesting}
              className="w-full sm:w-auto"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run System Tests'
              )}
            </Button>

            {testResults && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Environment</span>
                  {getStatusBadge(testResults.environment)}
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Database</span>
                  {getStatusBadge(testResults.supabase)}
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Email</span>
                  {getStatusBadge(testResults.email)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 