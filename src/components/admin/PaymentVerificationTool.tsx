import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Search, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

interface PaymentVerificationResult {
  success: boolean;
  payment_status: 'pending' | 'completed' | 'failed';
  transaction_id: string;
  gateway: string;
  amount?: number;
  currency?: string;
  gateway_response?: any;
  verified_at: string;
  error_message?: string;
  recommendations?: string[];
}

export const PaymentVerificationTool: React.FC = () => {
  const [transactionId, setTransactionId] = useState('');
  const [gateway, setGateway] = useState('payu');
  const [forceRefresh, setForceRefresh] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<PaymentVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = useSupabaseClient();

  const handleVerify = async () => {
    if (!transactionId.trim()) {
      setError('Transaction ID is required');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('payment-verification', {
        body: {
          transaction_id: transactionId.trim(),
          gateway,
          force_refresh: forceRefresh
        }
      });

      if (funcError) {
        throw funcError;
      }

      setResult(data);
    } catch (err) {
      console.error('Payment verification error:', err);
      setError(err.message || 'Failed to verify payment');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  const handleReset = () => {
    setTransactionId('');
    setGateway('payu');
    setForceRefresh(false);
    setResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Payment Verification Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transaction-id">Transaction ID</Label>
              <Input
                id="transaction-id"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction ID"
                disabled={isVerifying}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gateway">Payment Gateway</Label>
              <Select value={gateway} onValueChange={setGateway} disabled={isVerifying}>
                <SelectTrigger id="gateway">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payu">PayU</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="esewa">eSewa</SelectItem>
                  <SelectItem value="khalti">Khalti</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="force-refresh"
              checked={forceRefresh}
              onCheckedChange={setForceRefresh}
              disabled={isVerifying}
            />
            <Label htmlFor="force-refresh" className="text-sm">
              Force refresh (ignore cached results)
            </Label>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleVerify} 
              disabled={isVerifying || !transactionId.trim()}
              className="flex-1"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Verify Payment
                </>
              )}
            </Button>
            
            <Button 
              onClick={handleReset} 
              variant="outline"
              disabled={isVerifying}
            >
              Reset
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(result.payment_status)}
              Verification Result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Transaction ID</Label>
                <p className="text-sm text-muted-foreground">{result.transaction_id}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Gateway</Label>
                <p className="text-sm text-muted-foreground uppercase">{result.gateway}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Status</Label>
                <Badge className={getStatusColor(result.payment_status)}>
                  {result.payment_status.charAt(0).toUpperCase() + result.payment_status.slice(1)}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Verified At</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(result.verified_at).toLocaleString()}
                </p>
              </div>
              
              {result.amount && result.currency && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatAmount(result.amount, result.currency)}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Verification Success</Label>
                <Badge className={result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {result.success ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>

            {result.error_message && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{result.error_message}</AlertDescription>
              </Alert>
            )}

            {result.recommendations && result.recommendations.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Recommendations</Label>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.gateway_response && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Gateway Response</Label>
                <Textarea
                  value={JSON.stringify(result.gateway_response, null, 2)}
                  readOnly
                  className="font-mono text-xs"
                  rows={8}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};