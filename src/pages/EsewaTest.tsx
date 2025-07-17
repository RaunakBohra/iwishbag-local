import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  CreditCard,
  AlertCircle,
  User,
  Mail,
  Shield,
  RefreshCw,
  Play,
  Eye,
  Send,
} from 'lucide-react';

const EsewaTest = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [amount, setAmount] = useState('100');
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [isTestingPayment, setIsTestingPayment] = useState(false);
  const [testQuote, setTestQuote] = useState<any>(null);
  const [paymentResponse, setPaymentResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: session } = await supabase.auth.getSession();
      setSessionInfo(session);
      console.log('🔍 Session info:', session);
    };
    checkSession();
  }, []);

  const refreshSession = async () => {
    const { data: session } = await supabase.auth.getSession();
    setSessionInfo(session);
    console.log('🔄 Session refreshed:', session);
  };

  const resetAll = () => {
    setTestQuote(null);
    setPaymentResponse(null);
    setError(null);
    setSuccess(null);
    setAmount('100');
    console.log('🔄 Test state reset');
  };

  const createTestQuote = async () => {
    if (!user) {
      setError('Please log in to create a test quote');
      return;
    }

    setIsCreatingQuote(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('📝 Creating test quote...');

      // Create a test quote for eSewa payment
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          user_id: user.id,
          product_name: 'eSewa Test Product',
          item_price: parseFloat(amount),
          final_total: parseFloat(amount),
          final_currency: 'NPR',
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
      setSuccess('Test quote created successfully!');
      console.log('✅ Test quote created:', quote);
    } catch (error) {
      console.error('❌ Error creating test quote:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to create test quote'
      );
    } finally {
      setIsCreatingQuote(false);
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

    setIsTestingPayment(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🚀 Testing eSewa payment...');
      console.log('📋 Quote ID:', testQuote.id);
      console.log('👤 User ID:', user.id);

      // Verify session is valid
      const { data: session, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !session.session) {
        throw new Error(
          'Authentication session expired. Please refresh and try again.'
        );
      }

      console.log('✅ Session verified');

      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke(
        'create-payment',
        {
          body: {
            quoteIds: [testQuote.id],
            gateway: 'esewa',
            success_url:
              window.location.origin + '/payment-callback/esewa-success',
            cancel_url:
              window.location.origin + '/payment-callback/esewa-failure',
            amount: parseFloat(amount),
            currency: 'NPR',
            customerInfo: {
              name: 'Test Customer',
              email: user?.email || 'test@example.com',
              phone: '9806800001',
            },
          },
        }
      );

      if (error) {
        console.error('❌ Edge Function error:', error);
        throw new Error(`Payment API error: ${error.message}`);
      }

      console.log('✅ Payment response received:', data);
      setPaymentResponse(data);

      if (data && data.success) {
        setSuccess('Payment request created successfully!');
        console.log('✅ Payment data structure:');
        console.log('   - URL:', data.url);
        console.log('   - Method:', data.method);
        console.log('   - Has formData:', !!data.formData);
        console.log('   - Transaction ID:', data.transactionId);
        console.log(
          '   - Form fields:',
          data.formData ? Object.keys(data.formData) : 'None'
        );
      } else {
        setError('Payment request failed - invalid response structure');
      }
    } catch (error) {
      console.error('❌ Error testing eSewa payment:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to test eSewa payment'
      );
    } finally {
      setIsTestingPayment(false);
    }
  };

  const submitToEsewa = () => {
    if (!paymentResponse || !paymentResponse.formData) {
      setError('No payment data available for submission');
      return;
    }

    console.log('🚀 Submitting form to eSewa...');
    console.log('📤 Action URL:', paymentResponse.url);
    console.log('📤 Form data:', paymentResponse.formData);

    // Create and submit form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentResponse.url;
    form.target = '_blank'; // Open in new tab
    form.style.display = 'none';

    // Add form fields
    Object.entries(paymentResponse.formData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
      console.log(`📝 Added field: ${key} = ${value}`);
    });

    document.body.appendChild(form);

    console.log('✅ Form created with', form.elements.length, 'fields');
    console.log('🚀 Submitting to eSewa...');

    try {
      form.submit();
      console.log('✅ Form submitted successfully');
      setSuccess('Form submitted to eSewa! Check the new tab.');
    } catch (error) {
      console.error('❌ Form submission failed:', error);
      setError(
        'Form submission failed: ' +
          (error instanceof Error ? error.message : 'Unknown error')
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={resetAll}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset Test
          </Button>
        </div>

        {/* Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            🏦 eSewa Payment Testing
          </h1>
          <p className="text-xl text-gray-600">
            Test and debug eSewa payment gateway integration
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Success:</strong> {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Authentication Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!user ? (
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-800 font-medium">
                    Not logged in
                  </span>
                </div>
                <Button
                  onClick={() => navigate('/auth')}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  Login Required
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">
                    Authenticated
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>
                      <strong>Email:</strong> {user.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>
                      <strong>ID:</strong> {user.id?.slice(0, 12)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gray-500" />
                    <span>
                      <strong>Session:</strong>{' '}
                      {sessionInfo?.session ? '✅ Valid' : '❌ Invalid'}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={refreshSession}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh Session
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Test Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="amount" className="text-sm font-medium">
                  Test Amount
                </Label>
                <div className="mt-1 relative">
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="100"
                    className="pr-12"
                    disabled={isCreatingQuote || isTestingPayment}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Badge variant="outline" className="text-xs">
                      NPR
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Gateway</Label>
                <div className="mt-1 flex items-center h-10 px-3 bg-green-50 border border-green-200 rounded-md">
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-800"
                  >
                    eSewa (Nepal)
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Step 1: Create Quote */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                  1
                </div>
                Create Quote
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Generate a test quote for NPR {amount} that can be used for
                payment testing.
              </p>
              <Button
                onClick={createTestQuote}
                disabled={isCreatingQuote || !user}
                className="w-full"
              >
                {isCreatingQuote ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Create Test Quote
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Test Payment */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full font-bold">
                  2
                </div>
                Test Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Call the payment Edge Function to generate eSewa form data with
                signature.
              </p>
              <Button
                onClick={testEsewaPayment}
                disabled={isTestingPayment || !testQuote}
                className="w-full"
                variant="outline"
              >
                {isTestingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Test Payment API
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Step 3: Submit to eSewa */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-full font-bold">
                  3
                </div>
                Submit Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Submit the generated form data to eSewa using POST method.
              </p>
              <Button
                onClick={submitToEsewa}
                disabled={!paymentResponse || !paymentResponse.formData}
                className="w-full"
                variant="secondary"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit to eSewa
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quote Details */}
        {testQuote && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-green-700">
                📋 Test Quote Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-500">Quote ID:</span>
                  <p className="font-mono text-xs mt-1">{testQuote.id}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Amount:</span>
                  <p className="mt-1">NPR {testQuote.final_total}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Status:</span>
                  <p className="mt-1">
                    <Badge variant="outline">{testQuote.status}</Badge>
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Product:</span>
                  <p className="mt-1">{testQuote.product_name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Response */}
        {paymentResponse && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg text-blue-700 flex items-center gap-2">
                🔄 Payment API Response
                {paymentResponse.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
                <div>
                  <span className="font-medium text-gray-500">Success:</span>
                  <p className="mt-1">
                    {paymentResponse.success ? '✅ Yes' : '❌ No'}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Method:</span>
                  <p className="mt-1">{paymentResponse.method}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">
                    Transaction ID:
                  </span>
                  <p className="font-mono text-xs mt-1">
                    {paymentResponse.transactionId}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-500">Form Data:</span>
                  <p className="mt-1">
                    {paymentResponse.formData ? '✅ Present' : '❌ Missing'}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <span className="font-medium text-gray-500">eSewa URL:</span>
                <p className="text-xs mt-1 p-2 bg-gray-100 rounded font-mono break-all">
                  {paymentResponse.url}
                </p>
              </div>

              {paymentResponse.formData && (
                <div>
                  <span className="font-medium text-gray-500 mb-2 block">
                    Form Data (JSON):
                  </span>
                  <pre className="text-xs p-3 bg-gray-900 text-green-400 rounded overflow-x-auto">
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
            <CardTitle className="text-lg">📖 Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">🔧 Setup:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Make sure you're logged in to the application</li>
                  <li>Check that your session is valid (green checkmark)</li>
                  <li>Set your test amount (default: NPR 100)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">🧪 Testing Process:</h4>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Click "Create Test Quote" to generate a quote</li>
                  <li>Click "Test Payment API" to call the Edge Function</li>
                  <li>Review the response data and form fields</li>
                  <li>Click "Submit to eSewa" to open the payment form</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium mb-2">🔐 eSewa Test Credentials:</h4>
                <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                  <p>
                    <strong>eSewa ID:</strong> 9806800001 (or
                    9806800002/003/004/005)
                  </p>
                  <p>
                    <strong>Password:</strong> Nepal@123
                  </p>
                  <p>
                    <strong>MPIN:</strong> 1122
                  </p>
                  <p>
                    <strong>Token:</strong> 123456
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EsewaTest;
