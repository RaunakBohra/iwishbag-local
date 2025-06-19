import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ESewaPayment from '@/components/payment/ESewaPayment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle } from 'lucide-react';

export default function ESewaPaymentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [amount, setAmount] = useState(100);
  const [orderId, setOrderId] = useState(`ORDER_${Date.now()}`);
  const [customerEmail, setCustomerEmail] = useState('test@example.com');
  const [customerName, setCustomerName] = useState('Test Customer');
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    transactionId?: string;
    error?: string;
  } | null>(null);

  const handlePaymentSuccess = (transactionId: string) => {
    setPaymentResult({
      success: true,
      transactionId
    });
    
    toast({
      title: "Payment Successful!",
      description: `Transaction ID: ${transactionId}`,
      variant: "default"
    });
  };

  const handlePaymentFailure = (error: string) => {
    setPaymentResult({
      success: false,
      error
    });
    
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive"
    });
  };

  const handlePaymentCancel = () => {
    setPaymentResult(null);
    toast({
      title: "Payment Cancelled",
      description: "Payment was cancelled by the user.",
      variant: "default"
    });
  };

  const resetPayment = () => {
    setPaymentResult(null);
    setOrderId(`ORDER_${Date.now()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl text-center">eSewa Payment Test</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Payment Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Payment Details</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (NPR)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      min="1"
                      step="0.01"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="orderId">Order ID</Label>
                    <Input
                      id="orderId"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">Customer Email</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  <Button onClick={resetPayment} variant="outline" className="w-full">
                    Reset Payment
                  </Button>
                </div>

                {/* Payment Component */}
                <div>
                  <ESewaPayment
                    amount={amount}
                    orderId={orderId}
                    customerEmail={customerEmail}
                    customerName={customerName}
                    onSuccess={handlePaymentSuccess}
                    onFailure={handlePaymentFailure}
                    onCancel={handlePaymentCancel}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Result */}
          {paymentResult && (
            <Card className={`${paymentResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${paymentResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {paymentResult.success ? (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      Payment Successful
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5" />
                      Payment Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentResult.success ? (
                  <div className="space-y-2">
                    <p className="text-green-700">
                      <strong>Transaction ID:</strong> {paymentResult.transactionId}
                    </p>
                    <p className="text-green-700">
                      <strong>Amount:</strong> NPR {amount.toFixed(2)}
                    </p>
                    <p className="text-green-700">
                      <strong>Order ID:</strong> {orderId}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-red-700">
                      <strong>Error:</strong> {paymentResult.error}
                    </p>
                    <p className="text-red-700">
                      <strong>Order ID:</strong> {orderId}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="mt-8 text-center">
            <Button onClick={() => navigate('/')} variant="outline">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 