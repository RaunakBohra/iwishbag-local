// src/pages/OrderConfirmationPage.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Loader2, CreditCard, Truck, Banknote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { BankTransferDetails } from '@/components/dashboard/BankTransferDetails';

interface QuoteItem {
  product_name: string;
  quantity: number;
  item_price: number;
}

interface OrderDetails {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  quotes: {
    display_id: string;
    quote_items: QuoteItem[];
  }
}

const OrderConfirmationPage: React.FC = () => {
  const location = useLocation();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get order ID from the URL path, e.g., /order-confirmation/12345
    const pathParts = location.pathname.split('/');
    const orderId = pathParts[pathParts.length - 1];

    if (!orderId) {
      setError('No order ID found in the URL.');
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        const { data, error } = await supabase
          .from('quotes')
          .select(`
            id,
            display_id,
            final_total,
            final_currency,
            payment_method,
            quote_items (
              product_name,
              quantity,
              item_price
            )
          `)
          .eq('id', orderId)
          .single();

        if (error) throw error;
        
        if (data) {
          const formattedOrder = {
            id: data.id,
            displayId: data.display_id,
            amount: data.final_total,
            currency: data.final_currency,
            paymentMethod: data.payment_method,
            items: data.quote_items,
          };
          setOrderDetails(formattedOrder as any); // Cast for now
        } else {
          throw new Error('Order not found.');
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [location]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Confirming your payment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader className="bg-destructive text-destructive-foreground p-6">
            <div className="mx-auto bg-white rounded-full p-2 w-fit">
              <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
            <CardTitle className="mt-4 text-2xl">Payment Error</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader className="bg-green-500 text-green-50 p-6">
          <div className="mx-auto bg-white rounded-full p-2 w-fit">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="mt-4 text-2xl">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-lg text-muted-foreground">
            Thank you for your purchase. Your order has been confirmed.
          </p>
          <div className="border-t border-b py-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Order ID:</span>
              <Badge variant="secondary" className="text-lg">
                {orderDetails?.displayId || 'N/A'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Amount Paid:</span>
              <span className="font-bold text-lg">
                {orderDetails?.amount?.toFixed(2)} {orderDetails?.currency}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Payment Method:</span>
              <div className="flex items-center gap-2">
                {orderDetails?.paymentMethod === 'bank_transfer' && <Banknote className="h-4 w-4" />}
                {orderDetails?.paymentMethod === 'cod' && <Truck className="h-4 w-4" />}
                {(orderDetails?.paymentMethod === 'stripe' || orderDetails?.paymentMethod === 'payu') && <CreditCard className="h-4 w-4" />}
                <span className="font-medium">
                  {orderDetails?.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                   orderDetails?.paymentMethod === 'cod' ? 'Cash on Delivery' :
                   orderDetails?.paymentMethod === 'stripe' ? 'Credit Card' :
                   orderDetails?.paymentMethod === 'payu' ? 'PayU' :
                   orderDetails?.paymentMethod || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-left mb-2">Order Summary:</h3>
            <div className="text-left text-muted-foreground space-y-2">
              {orderDetails?.items && orderDetails.items.length > 0 ? (
                orderDetails.items.map((item: QuoteItem, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.product_name || 'Unnamed Product'} (x{item.quantity})</span>
                    <span>{(item.item_price * item.quantity).toFixed(2)} {orderDetails.currency}</span>
                  </div>
                ))
              ) : (
                <p>Product details unavailable</p>
              )}
            </div>
          </div>

          {/* Payment Method Specific Instructions */}
          {orderDetails?.paymentMethod === 'bank_transfer' && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Complete Your Bank Transfer
              </h4>
              <p className="text-sm text-blue-800 mb-4">
                Please transfer the amount to the following bank account. Your order will be processed once we receive the payment.
              </p>
              <BankTransferDetails />
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Please include your Order ID ({orderDetails?.displayId}) in the transfer reference/memo for faster processing.
                </p>
              </div>
            </div>
          )}

          {orderDetails?.paymentMethod === 'cod' && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Cash on Delivery
              </h4>
              <p className="text-sm text-green-800 mb-2">
                Your order will be delivered to your address. Please have the exact amount ready for payment upon delivery.
              </p>
              <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>Amount to pay on delivery:</strong> {orderDetails?.amount?.toFixed(2)} {orderDetails?.currency}
                </p>
              </div>
            </div>
          )}

          {(orderDetails?.paymentMethod === 'stripe' || orderDetails?.paymentMethod === 'payu') && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Processed
              </h4>
              <p className="text-sm text-gray-800">
                Your payment has been successfully processed. You will receive a confirmation email shortly.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col sm:flex-row gap-2">
          <Button asChild className="w-full">
            <Link to="/dashboard">View Order in Dashboard</Link>
            </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/">Continue Shopping</Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OrderConfirmationPage;
