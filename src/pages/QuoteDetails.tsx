import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { QuoteBreakdown } from "@/components/dashboard/QuoteBreakdown";
import { QuoteMessaging } from "@/components/messaging/QuoteMessaging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuoteSteps } from "@/hooks/useQuoteSteps";
import { useQuoteState } from "@/hooks/useQuoteState";

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  rejection_reasons?: { reason: string } | null;
};

export const QuoteDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { approveQuote, rejectQuote, addToCart, isUpdating } = useQuoteState(id || '');

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*),
          rejection_reasons (reason)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as QuoteWithItems;
    },
    enabled: !!id && !!user,
  });

  const steps = useQuoteSteps(quote);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-12 space-y-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="bg-card border border-border rounded-lg p-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-12">
          <div className="bg-card border border-border rounded-lg p-6">
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof Error ? error.message : 'Failed to load quote'}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 space-y-8">
        {quote.status === 'requested' ? (
          <>
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-foreground">
                  Quote Request Received
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Thank you for your quote request. Our team is currently preparing your quote and will get back to you shortly. 
                  You can see the items you've requested below.
                </p>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Items Requested</h3>
                  <div className="space-y-4">
                    {quote.quote_items?.map((item) => (
                      <div key={item.id} className="flex items-start gap-4 p-4 bg-card border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        {item.image_url && (
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted">
                            <img 
                              src={item.image_url} 
                              alt={item.product_name || 'Product'} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{item.product_name}</h4>
                          <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <QuoteBreakdown 
            quote={quote} 
            onApprove={approveQuote}
            onReject={rejectQuote}
            isProcessing={isUpdating}
            onAddToCart={addToCart}
          />
        )}
      </div>
    </div>
  );
};

export default QuoteDetails;
