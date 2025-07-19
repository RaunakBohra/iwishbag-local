import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  CreditCard,
  User,
  Mail,
  Phone,
  RefreshCw,
} from 'lucide-react';

const TestPayment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [amount, setAmount] = useState('100');
  const [testing, setTesting] = useState(false);
  const [testQuote, setTestQuote] = useState<any>(null);
  const [paymentResponse, setPaymentResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: session } = await supabase.auth.getSession();
      setSessionInfo(session);
      console.log('🔍 Current session:', session);
    };
    checkSession();
  }, []);

  const refreshSession = async () => {
    const { data: session } = await supabase.auth.getSession();
    setSessionInfo(session);
    console.log('🔄 Session refreshed:', session);
  };

  const createTestQuote = async () => {
    if (!user) {
      setError('Please log in to create a test quote');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      // Create a test quote for eSewa payment
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          product_name: 'eSewa Test Product',
          item_price: parseFloat(amount),
          final_total_usd: parseFloat(amount),
          destination_currency: 'NPR',
          origin_country: 'US',
          destination_country: 'NP',
          customer_name: 'Test Customer',
          email: user.email || 'test@example.com',
          shipping_address: {
            name: 'Test Customer',
            phone: '9806800001',
            address_line1: 'Test Address',
            city: 'Kathmandu',
            state_province_region: 'Bagmati',
            postal_code: '44600',
            country: 'NP',
          },
          status: 'approved', // Set to approved so it can be used for payment
        })
        .select()
        .single();

      if (quoteError) {
        throw new Error(`Failed to create test quote: ${quoteError.message}`);
      }

      setTestQuote(quote);
      console.log('✅ Test quote created:', quote);
    } catch (error) {
      console.error('❌ Error creating test quote:', error);
      setError(error instanceof Error ? error.message : 'Failed to create test quote');
    } finally {
      setTesting(false);
    }
  };

  const testEsewaPayment = async () => {
    if (!testQuote) {
      setError('Please create a test quote first');
      return;
    }

    if (!user) {
      setError('Please log in to test eSewa payment');
      return;
    }

    setTesting(true);
    setError(null);

    try {
      console.log('🚀 Testing eSewa payment with quote:', testQuote.id);
      console.log('🔍 User authenticated:', !!user);
      console.log('🔍 User ID:', user.id);

      // Get the current session to ensure we have a valid auth token
      const { data: session, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session.session) {
        throw new Error('Authentication required. Please log in again.');
      }

      console.log('✅ Valid session found');

      // Call the Edge Function with proper authentication
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          quoteIds: [testQuote.id],
          gateway: 'esewa',
          success_url: window.location.origin + '/payment-callback/esewa-success',
          cancel_url: window.location.origin + '/payment-callback/esewa-failure',
          amount: parseFloat(amount),
          currency: 'NPR',
          customerInfo: {
            name: 'Test Customer',
            email: user?.email || 'test@example.com',
            phone: '9806800001',
          },
        },
      });

      if (error) {
        throw new Error(`Edge Function error: ${error.message}`);
      }

      console.log('✅ eSewa payment response:', data);
      setPaymentResponse(data);

      // Check if we got the expected response structure
      if (data && data.success) {
        console.log('✅ Payment response structure valid');
        console.log('📋 URL:', data.url);
        console.log('📋 Method:', data.method);
        console.log('📋 Has formData:', !!data.formData);
        console.log('📋 FormData keys:', data.formData ? Object.keys(data.formData) : 'None');
        console.log('📋 FormData:', data.formData);
      } else {
        console.log('❌ Invalid payment response structure');
      }
    } catch (error) {
      console.error('❌ Error testing eSewa payment:', error);
      setError(error instanceof Error ? error.message : 'Failed to test eSewa payment');
    } finally {
      setTesting(false);
    }
  };

  const simulateFormSubmission = () => {
    if (!paymentResponse || !paymentResponse.formData) {
      setError('No payment response or form data available');
      return;
    }

    console.log('🔍 Simulating form submission...');
    console.log('🔍 Form action URL:', paymentResponse.url);
    console.log('🔍 Form data:', paymentResponse.formData);

    // Create and submit form exactly like the Checkout component
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentResponse.url;
    form.target = '_blank'; // Open in new tab for testing
    form.style.display = 'none';

    // Add all form fields
    Object.entries(paymentResponse.formData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
      console.log(`📝 Form field: ${key} = ${value}`);
    });

    document.body.appendChild(form);

    console.log('✅ Form created with ' + form.elements.length + ' fields');
    console.log('🚀 Submitting form...');

    try {
      form.submit();
      console.log('✅ Form submitted successfully');
    } catch (error) {
      console.error('❌ Form submission failed:', error);
      setError(
        'Form submission failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  };

  const clearAll = () => {
    setTestQuote(null);
    setPaymentResponse(null);
    setError(null);
    setAmount('100');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">eSewa Payment Gateway Testing</h1>
          <p className="text-gray-600">Test and debug eSewa payment integration</p>
        </div>

        {/* Authentication Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!user ? (
              <div className="p-4 bg-red-50 rounded-lg flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">Please log in to test eSewa payments</span>
                <Button onClick={() => navigate('/auth')} size="sm" className="ml-auto">
                  Login
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">User authenticated</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>
                      <strong>Email:</strong> {user.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>
                      <strong>User ID:</strong> {user.id?.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>
                      <strong>Session:</strong> {sessionInfo?.session ? '✅ Valid' : '❌ Invalid'}
                    </span>
                  </div>
                </div>
                <Button onClick={refreshSession} size="sm" variant="outline" className="mt-3">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Session
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Test Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Test Amount (NPR)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100"
                  disabled={testing}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <div className="flex items-center h-10 px-3 bg-gray-50 border rounded-md">
                  <Badge variant="outline">NPR (Nepal Rupees)</Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createTestQuote} disabled={testing || !user} className="flex-1">
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Quote...
                  </>
                ) : (
                  '1. Create Test Quote'
                )}
              </Button>

              <Button
                onClick={testEsewaPayment}
                disabled={testing || !testQuote}
                className="flex-1"
                variant="outline"
              >
                {testing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing Payment...
                  </>
                ) : (
                  '2. Test eSewa Payment'
                )}
              </Button>

              <Button
                onClick={simulateFormSubmission}
                disabled={!paymentResponse || !paymentResponse.formData}
                className="flex-1"
                variant="secondary"
              >
                3. Submit Form
              </Button>

              <Button onClick={clearAll} variant="outline" size="sm">
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="p-4 bg-red-50 rounded-lg flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <span className="text-red-800 font-medium">Error:</span>
                  <p className="text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Quote Display */}
        {testQuote && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Test Quote Created</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Quote ID:</strong> {testQuote.id}
                </div>
                <div>
                  <strong>Amount:</strong> NPR {testQuote.final_total_usd}
                </div>
                <div>
                  <strong>Currency:</strong> {testQuote.destination_currency}
                </div>
                <div>
                  <strong>Status:</strong> <Badge variant="outline">{testQuote.status}</Badge>
                </div>
                <div>
                  <strong>Product:</strong> {testQuote.product_name}
                </div>
                <div>
                  <strong>Customer:</strong> {testQuote.customer_name}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Response Display */}
        {paymentResponse && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                Payment Response
                {paymentResponse.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 inline ml-2" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 inline ml-2" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <strong>Success:</strong> {paymentResponse.success ? '✅ Yes' : '❌ No'}
                </div>
                <div>
                  <strong>Method:</strong> {paymentResponse.method}
                </div>
                <div>
                  <strong>Transaction ID:</strong> {paymentResponse.transactionId}
                </div>
                <div>
                  <strong>Gateway:</strong> {paymentResponse.gateway}
                </div>
                <div>
                  <strong>Amount:</strong> NPR {paymentResponse.amount}
                </div>
                <div>
                  <strong>Currency:</strong> {paymentResponse.currency}
                </div>
                <div>
                  <strong>Has Form Data:</strong> {paymentResponse.formData ? '✅ Yes' : '❌ No'}
                </div>
                <div>
                  <strong>URL:</strong>{' '}
                  <span className="text-xs break-all">{paymentResponse.url}</span>
                </div>
              </div>

              {paymentResponse.formData && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Form Data (will be sent to eSewa):
                  </Label>
                  <pre className="p-3 bg-gray-100 rounded text-xs overflow-x-auto border">
                    {JSON.stringify(paymentResponse.formData, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Make sure you're logged in with a valid account</li>
              <li>Set your test amount (default: NPR 100)</li>
              <li>Click "Create Test Quote" to generate a test quote</li>
              <li>Click "Test eSewa Payment" to call the Edge Function</li>
              <li>Check the browser console for detailed logs</li>
              <li>Click "Submit Form" to simulate the actual form submission</li>
              <li>The form will open in a new tab - verify it uses POST method</li>
              <li>
                Use eSewa test credentials: ID: 9806800001, Password: Nepal@123, Token: 123456
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestPayment;
