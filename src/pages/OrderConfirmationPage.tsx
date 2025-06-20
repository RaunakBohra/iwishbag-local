// src/pages/OrderConfirmationPage.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface QuoteItem {
  product_name: string;
  quantity: number;
  item_price: number;
}

interface OrderDetails {
  id: string;
  amount: number;
  currency: string;
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
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get('session_id');

    // console.log('Original sessionId from URL:', sessionId); // Debugging line

    // A more robust way to clean the session ID from any trailing characters
    // if (sessionId) {
    //   sessionId = sessionId.replace(/[^a-zA-Z0-9_]+$/, '');
    // }
    
    // console.log('Cleaned sessionId sent to backend:', sessionId); // Debugging line

    if (!sessionId) {
      setError('No session ID found in the URL.');
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('User not authenticated');
        }

        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-order-details`;

        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch order details.');
        }
        
        setOrderDetails(result.order);
        console.log('Received order details:', result.order);
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
                {orderDetails?.quotes?.display_id || 'N/A'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">Amount Paid:</span>
              <span className="font-bold text-lg">
                {orderDetails?.amount.toFixed(2)} {orderDetails?.currency}
              </span>
            </div>
          </div>
          <div>
            <h3 className="font-medium text-left mb-2">Order Summary:</h3>
            <div className="text-left text-muted-foreground space-y-2">
              {orderDetails?.quotes?.quote_items && orderDetails.quotes.quote_items.length > 0 ? (
                orderDetails.quotes.quote_items.map((item, index) => (
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
