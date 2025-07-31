import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';

const TestSES = () => {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const sendTestEmail = async () => {
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-email-ses-test', {
        body: {
          to: email,
          subject: 'Test Email from AWS SES - iwishBag',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #0d9488;">Test Email from AWS SES</h1>
              <p>Congratulations! Your AWS SES integration is working perfectly.</p>
              <p>This email was sent using Amazon SES instead of Resend.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e5e5;">
              <p style="color: #666; font-size: 14px;">
                Sent from: noreply@iwishbag.com<br>
                Provider: AWS SES<br>
                Region: us-east-1
              </p>
            </div>
          `,
          text: 'Test Email from AWS SES - Your AWS SES integration is working!',
        },
      });

      if (error) {
        throw error;
      }

      setResult(data);
      toast({
        title: 'Email sent successfully!',
        description: `Check ${email} for the test message`,
      });
    } catch (error: any) {
      console.error('Error sending email:', error);
      setResult({ error: error.message });
      toast({
        title: 'Failed to send email',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Test AWS SES Email
          </CardTitle>
          <CardDescription>
            Send a test email using the new AWS SES integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Recipient Email</label>
            <Input
              type="email"
              placeholder="test@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSending}
            />
            <p className="text-sm text-gray-500">
              Note: In sandbox mode, you can only send to verified email addresses.
            </p>
          </div>

          <Button
            onClick={sendTestEmail}
            disabled={isSending || !email}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Test Email
              </>
            )}
          </Button>

          {result && (
            <div
              className={`mt-4 p-4 rounded-lg ${
                result.error
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-green-50 border border-green-200'
              }`}
            >
              {result.error ? (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Error</p>
                    <p className="text-sm text-red-700">{result.error}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Success!</p>
                    <p className="text-sm text-green-700">
                      Message ID: {result.messageId}
                    </p>
                    <p className="text-sm text-green-700">
                      Provider: {result.provider}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-medium text-amber-900 mb-2">AWS SES Sandbox Mode</h3>
            <p className="text-sm text-amber-700">
              Your AWS SES account is in sandbox mode. You can only send emails to:
            </p>
            <ul className="text-sm text-amber-700 mt-2 list-disc list-inside">
              <li>Verified email addresses</li>
              <li>The email address you verified during setup</li>
            </ul>
            <p className="text-sm text-amber-700 mt-2">
              To send to any email address, request production access in the AWS SES console.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestSES;