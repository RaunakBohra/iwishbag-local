import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Copy, CheckCircle, AlertCircle } from 'lucide-react';

export default function TestSMS() {
  const [recentOTPs, setRecentOTPs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedOTP, setCopiedOTP] = useState<string | null>(null);

  const fetchRecentOTPs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_recent_test_otps');
      
      if (error) {
        // If RPC doesn't exist, fetch directly
        const { data: otps } = await supabase
          .from('phone_otps')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (otps) {
          const decodedOTPs = otps.map(otp => ({
            ...otp,
            otp_code: atob(otp.otp_hash).substring(0, 6)
          }));
          setRecentOTPs(decodedOTPs);
        }
      } else {
        setRecentOTPs(data || []);
      }
    } catch (error) {
      console.error('Error fetching OTPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyOTP = (otp: string) => {
    navigator.clipboard.writeText(otp);
    setCopiedOTP(otp);
    setTimeout(() => setCopiedOTP(null), 2000);
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>SMS Test Mode Dashboard</CardTitle>
          <CardDescription>
            View OTPs without sending actual SMS messages (Test Mode Enabled)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Test Mode is ON</strong> - SMS messages are not being sent. 
              OTPs are stored in the database and displayed here for testing.
            </AlertDescription>
          </Alert>

          <div className="mb-4">
            <Button onClick={fetchRecentOTPs} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh OTPs'}
            </Button>
          </div>

          <div className="space-y-4">
            {recentOTPs.length === 0 ? (
              <p className="text-muted-foreground">No recent OTPs. Try changing a phone number first.</p>
            ) : (
              recentOTPs.map((otp) => (
                <div 
                  key={otp.id} 
                  className={`border rounded-lg p-4 ${isExpired(otp.expires_at) ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{otp.phone}</p>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(otp.created_at).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Expires: {new Date(otp.expires_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isExpired(otp.expires_at) ? 'destructive' : 'default'}>
                        {otp.otp_code}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyOTP(otp.otp_code)}
                        disabled={isExpired(otp.expires_at)}
                      >
                        {copiedOTP === otp.otp_code ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {otp.used_at && (
                    <Badge variant="secondary" className="mt-2">
                      Used at: {new Date(otp.used_at).toLocaleString()}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}