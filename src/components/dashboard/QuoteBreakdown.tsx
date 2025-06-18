import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { QuoteBreakdownHeader } from './QuoteBreakdownHeader';
import { QuoteBreakdownDetails } from './QuoteBreakdownDetails';
import { QuoteBreakdownApproval } from './QuoteBreakdownApproval';
import { QuoteItemCard } from './QuoteItemCard';
import { Banknote, Clock, ShoppingCart, Package, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [isItemsExpanded, setIsItemsExpanded] = useState(true);
  const hasCalculation = quote.final_total !== null;
  const showBreakdown = hasCalculation && (quote.status === 'sent' || quote.approval_status === 'approved' || quote.approval_status === 'rejected' || quote.status === 'accepted');
  const canApproveReject = quote.status === 'sent' && quote.approval_status === 'pending';
  const isAccepted = quote.status === 'accepted';

  const { data: countrySettings } = useQuery({
    queryKey: ['country_settings', quote.country_code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_settings')
        .select('*')
        .eq('code', quote.country_code)
        .single();
      if (error) throw error;
      return data;
    }
  });

  return (
    <Card className="w-full overflow-hidden">
      <QuoteBreakdownHeader quote={quote} />
      <CardContent className="pt-6 space-y-8">
        <div>
          <div className="flex items-center justify-center mb-6 relative">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <h3 className="text-xl font-semibold">Items Requested</h3>
            </div>
            <button
              onClick={() => setIsItemsExpanded(!isItemsExpanded)}
              className="absolute right-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              {isItemsExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>

          {isItemsExpanded && (
            <div className={`grid gap-4 ${
              quote.quote_items.length === 1 
                ? 'grid-cols-1 max-w-md mx-auto' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {quote.quote_items.map((item) => (
                <div key={item.id} className="group relative">
                  {item.product_url ? (
                    <a
                      href={item.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:ring-2 hover:ring-blue-500/20"
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-start gap-3">
                          {item.image_url && (
                            <div className="relative h-16 w-16 flex-shrink-0">
                              <img
                                src={item.image_url}
                                alt={item.product_name}
                                className="rounded-md object-cover h-full w-full"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                {item.product_name}
                              </span>
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                width="16" 
                                height="16" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                className="h-4 w-4 text-blue-500 flex-shrink-0"
                              >
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                              </svg>
                            </div>
                            {item.options && (
                              <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {(() => {
                                  try {
                                    let options;
                                    if (typeof item.options === 'string') {
                                      try {
                                        options = JSON.parse(item.options);
                                      } catch {
                                        options = { 'Option': item.options };
                                      }
                                    } else {
                                      options = item.options;
                                    }
                                    
                                    return Object.entries(options).map(([key, value]) => (
                                      <span key={key} className="inline-block mr-2">
                                        {key}: {value as string}
                                      </span>
                                    ));
                                  } catch (e) {
                                    return null;
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-gray-700">
                          <span>Qty: {item.quantity}</span>
                          {item.item_weight > 0 && (
                            <span>Weight: {item.item_weight} {countrySettings?.weight_unit || 'kg'}</span>
                          )}
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex flex-col h-full">
                        <div className="flex items-start gap-3">
                          {item.image_url && (
                            <div className="relative h-16 w-16 flex-shrink-0">
                              <img
                                src={item.image_url}
                                alt={item.product_name}
                                className="rounded-md object-cover h-full w-full"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-gray-900 line-clamp-2">
                              {item.product_name}
                            </span>
                            {item.options && (
                              <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {(() => {
                                  try {
                                    let options;
                                    if (typeof item.options === 'string') {
                                      try {
                                        options = JSON.parse(item.options);
                                      } catch {
                                        options = { 'Option': item.options };
                                      }
                                    } else {
                                      options = item.options;
                                    }
                                    
                                    return Object.entries(options).map(([key, value]) => (
                                      <span key={key} className="inline-block mr-2">
                                        {key}: {value as string}
                                      </span>
                                    ));
                                  } catch (e) {
                                    return null;
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-gray-700">
                          <span>Qty: {item.quantity}</span>
                          {item.item_weight > 0 && (
                            <span>Weight: {item.item_weight} {countrySettings?.weight_unit || 'kg'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {quote.quote_items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No items found for this quote.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {hasCalculation && !showBreakdown && (
          <div className="pt-6 border-t">
            <Alert className="bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-700">Quote Under Review</AlertTitle>
              <AlertDescription className="text-blue-600">
                Your quote has been calculated and is being reviewed by our team. You will be notified when it is sent and ready for your approval.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {showBreakdown && (
          <div className="space-y-6 pt-6 border-t">
            <QuoteBreakdownDetails quote={quote} countrySettings={countrySettings} />
            
            {isAccepted && !quote.payment_method && (
              <Alert className={`${quote.in_cart ? "bg-green-50 border-green-200 hover:bg-green-100" : "bg-blue-50 border-blue-200 hover:bg-blue-100"} transition-colors`}>
                <ShoppingCart className={`h-4 w-4 ${quote.in_cart ? "text-green-500" : "text-blue-500"}`} />
                <AlertTitle className={quote.in_cart ? "text-green-700" : "text-blue-700"}>
                  {quote.in_cart ? 'In Cart' : 'Quote Approved'}
                </AlertTitle>
                <AlertDescription className={quote.in_cart ? "text-green-600" : "text-blue-600"}>
                  {quote.in_cart ? (
                    <>
                      This quote is in your cart. You can complete your order from there.
                      <Button asChild className="w-full mt-2 bg-green-600 hover:bg-green-700 transition-colors">
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
                          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
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
              <Alert className="bg-green-50 border-green-200 hover:bg-green-100 transition-colors">
                <Banknote className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700">Cash on Delivery</AlertTitle>
                <AlertDescription className="text-green-600">
                  Your order has been placed. You will pay in cash upon delivery. Our team will contact you shortly to coordinate.
                </AlertDescription>
              </Alert>
            )}

            {quote.payment_method === 'bank_transfer' && (
              <Alert className="bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors">
                <Clock className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">Awaiting Bank Transfer Confirmation</AlertTitle>
                <AlertDescription className="text-blue-600">
                  We are waiting to confirm receipt of your bank transfer. This may take 1-3 business days. Your order will be processed as soon as payment is confirmed.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
