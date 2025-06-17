import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';

import { QuoteBreakdownHeader } from './QuoteBreakdownHeader';
import { QuoteBreakdownDetails } from './QuoteBreakdownDetails';
import { QuoteBreakdownApproval } from './QuoteBreakdownApproval';
import { QuoteBreakdownStatusAlert } from './QuoteBreakdownStatusAlert';
import { QuoteItemCard } from './QuoteItemCard';
import { Info, Banknote, Clock, ShoppingCart } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  rejection_reasons?: { reason: string } | null;
};

interface QuoteBreakdownProps {
  quote: QuoteWithItems;
  onApprove: (quoteId: string) => void;
  onReject: () => void;
  isProcessing: boolean;
  onAddToCart?: (quoteId: string) => void;
}

export const QuoteBreakdown: React.FC<QuoteBreakdownProps> = ({
  quote,
  onApprove,
  onReject,
  isProcessing,
  onAddToCart,
}) => {
  const hasCalculation = quote.final_total !== null;
  const showBreakdown = hasCalculation && (quote.status === 'sent' || quote.approval_status === 'approved' || quote.approval_status === 'rejected' || quote.status === 'accepted');
  const canApproveReject = quote.status === 'sent' && quote.approval_status === 'pending';
  const isAccepted = quote.status === 'accepted';
  const localCurrency = quote.final_currency || 'USD';

  return (
    <Card className="w-full">
      <QuoteBreakdownHeader quote={quote} />
      <CardContent className="pt-0 space-y-6">
        <div>
          <h3 className="text-lg font-semibold my-4">Items Requested</h3>
          <div className="space-y-4">
            {quote.quote_items.map((item) => (
              <QuoteItemCard key={item.id} item={item} />
            ))}
            {quote.quote_items.length === 0 && <p className="text-sm text-muted-foreground">No items found for this quote.</p>}
          </div>
        </div>

        {hasCalculation && !showBreakdown && (
          <div className="pt-6 border-t">
              <Alert>
                  <AlertTitle>Quote Under Review</AlertTitle>
                  <AlertDescription>
                      Your quote has been calculated and is being reviewed by our team. You will be notified when it is sent and ready for your approval.
                  </AlertDescription>
              </Alert>
          </div>
        )}

        {showBreakdown && (
          <div className="space-y-4 pt-6 border-t">
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm flex items-start gap-3">
                <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  Final prices are shown in <strong>{localCurrency}</strong>, based on shipping to <strong>{quote.country_code}</strong>. For your reference, we've also included the equivalent cost in USD in the breakdown below.
                </div>
            </div>
            <QuoteBreakdownDetails quote={quote} />
            {isAccepted && !quote.payment_method && (
              <Alert>
                <ShoppingCart className="h-4 w-4" />
                <AlertTitle>{quote.in_cart ? 'In Cart' : 'Quote Approved'}</AlertTitle>
                <AlertDescription>
                  {quote.in_cart ? (
                    <>
                      This quote is in your cart. You can complete your order from there.
                      <Button asChild className="w-full mt-2">
                        <Link to="/cart">Go to Cart</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      This quote has been approved but is not in your cart.
                      {onAddToCart && (
                        <Button 
                          onClick={() => onAddToCart(quote.id)} 
                          disabled={isProcessing}
                          className="w-full mt-2 flex items-center justify-center gap-2"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Add to Cart
                        </Button>
                      )}
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <QuoteBreakdownApproval
              canApproveReject={canApproveReject}
              isProcessing={isProcessing}
              quoteId={quote.id}
              onApprove={onApprove}
              onReject={onReject}
            />
            {quote.payment_method === 'cod' && (
                <Alert>
                    <Banknote className="h-4 w-4" />
                    <AlertTitle>Cash on Delivery</AlertTitle>
                    <AlertDescription>
                        Your order has been placed. You will pay in cash upon delivery. Our team will contact you shortly to coordinate.
                    </AlertDescription>
                </Alert>
            )}
            {quote.payment_method === 'bank_transfer' && (
                <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertTitle>Awaiting Bank Transfer Confirmation</AlertTitle>
                    <AlertDescription>
                        We are waiting to confirm receipt of your bank transfer. This may take 1-3 business days. Your order will be processed as soon as payment is confirmed.
                    </AlertDescription>
                </Alert>
            )}
            <QuoteBreakdownStatusAlert
              approval_status={quote.approval_status}
              approved_at={quote.approved_at}
              rejected_at={quote.rejected_at}
              rejection_reason={quote.rejection_reasons?.reason}
              rejection_details={quote.rejection_details}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
