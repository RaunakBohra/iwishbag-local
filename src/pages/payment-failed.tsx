import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentDetails, setPaymentDetails] = useState({
    method: searchParams.get('method') || 'unknown',
    orderId: searchParams.get('order_id') || 'unknown',
    error: searchParams.get('error') || 'Payment failed'
  });

  useEffect(() => {
    // Log payment failure for debugging
    console.log('Payment Failed Page Loaded');
    console.log('URL Parameters:', Object.fromEntries(searchParams.entries()));
    console.log('Payment Details:', paymentDetails);
  }, [searchParams, paymentDetails]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-800">Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-600">
              Your payment could not be processed.
            </p>
            <p className="text-sm text-gray-500">
              Please try again or contact support if the problem persists.
            </p>
          </div>

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gray-900">Payment Details</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="font-medium capitalize">{paymentDetails.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-mono text-xs">{paymentDetails.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Error:</span>
                <span className="text-red-600 text-xs">{paymentDetails.error}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/esewa-payment')} 
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          {/* Debug Info */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Debug Information
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono">
              <div><strong>URL:</strong> {window.location.href}</div>
              <div><strong>Method:</strong> {paymentDetails.method}</div>
              <div><strong>Order ID:</strong> {paymentDetails.orderId}</div>
              <div><strong>Error:</strong> {paymentDetails.error}</div>
              <div><strong>All Params:</strong> {Object.fromEntries(searchParams.entries())}</div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
} 