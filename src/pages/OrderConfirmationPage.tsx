// src/pages/OrderConfirmationPage.tsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Tables } from '@/integrations/supabase/types'; // Correct import for Tables
type QuoteType = Tables<'quotes'>; // Define QuoteType using Tables
import { Quote as QuoteType } from '@/integrations/supabase/types'; // Renamed to QuoteType
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Import CardDescription
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BankTransferDetails } from '@/components/dashboard/BankTransferDetails';
import { formatCurrency } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const OrderConfirmationPage = () => {
  const { id: orderId } = useParams<{ id: string }>(); // Get order/quote ID from URL

  const { data: order, isLoading, isError, error } = useQuery<QuoteType, Error>({
    queryKey: ['orderConfirmation', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is missing');
      const { data, error } = await supabase
        .from('quotes') // Quotes are converted to orders, so fetch from quotes table
        .select('*')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading order confirmation...</p>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-red-500">
        <XCircle className="h-10 w-10 mb-4" />
        <p className="text-lg">Failed to load order details. {error?.message}</p>
        <Button asChild className="mt-4">
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const isBankTransfer = order.payment_method === 'bank_transfer';
  const isPaidOrPending = order.status === 'paid' || order.status === 'cod_pending' || order.status === 'bank_transfer_pending';


  return (
    <div className="container mx-auto p-4 md:py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader className="text-center">
          {isBankTransfer ? (
            <div className="flex flex-col items-center space-y-2">
              <AlertCircle className="h-12 w-12 text-blue-500" />
              <CardTitle className="text-3xl font-bold text-blue-600">Bank Transfer Details</CardTitle>
              <CardDescription className="text-lg">
                Your order has been placed. Please use the details below to complete your payment.
              </CardDescription>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <CardTitle className="text-3xl font-bold text-green-600">Order Placed Successfully!</CardTitle>
              <CardDescription className="text-lg">
                Your order #{order.order_display_id || order.id?.substring(0, 8).toUpperCase()} has been confirmed.
              </CardDescription>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <h2 className="text-xl font-semibold text-center">Order Summary</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Order ID:</strong></div>
            <div>{order.order_display_id || order.id?.substring(0, 8).toUpperCase()}</div>

            <div><strong>Total Amount:</strong></div>
            <div>{formatCurrency(order.final_total_target_currency || 0, order.target_currency || 'USD')}</div>

            <div><strong>Payment Method:</strong></div>
            <div>{order.payment_method === 'bank_transfer' ? 'Bank Transfer (Pending)' : order.payment_method}</div>

            <div><strong>Status:</strong></div>
            <div>{order.status}</div>

            <div><strong>Items:</strong></div>
            <div>
              {order.items?.map(item => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.product_name}</span>
                  <span>{item.quantity} x {formatCurrency(item.original_price || 0, item.original_currency || 'USD')}</span>
                </div>
              ))}
            </div>
          </div>

          {isBankTransfer && (
            <>
              <Separator />
              <h3 className="text-xl font-semibold text-center text-blue-600">Payment Instructions</h3>
              <BankTransferDetails /> {/* This component fetches and displays bank details */}
              <p className="text-center text-sm text-muted-foreground mt-4">
                Please make the payment using the bank details above. Your order will be processed once payment is confirmed.
              </p>
            </>
          )}

          <Separator />
          <div className="text-center">
            <Button asChild>
              <Link to="/dashboard">Go to Your Dashboard</Link>
            </Button>
            <Button variant="outline" asChild className="ml-2">
              <Link to="/quote">Request a New Quote</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderConfirmationPage;
