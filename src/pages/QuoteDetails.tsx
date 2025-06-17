import { useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteBreakdown } from "@/components/dashboard/QuoteBreakdown";
import { useState } from "react";
import { QuoteMessaging } from "@/components/messaging/QuoteMessaging";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerRejectQuoteDialog } from "@/components/dashboard/CustomerRejectQuoteDialog";
import { useQuoteState } from "@/hooks/useQuoteState";
import { isQuoteEditable } from "@/types/quote";
import { QuoteStepper } from "@/components/dashboard/QuoteStepper";
import { useQuoteSteps } from "@/hooks/useQuoteSteps";
import { QuoteMainInfoCard } from '@/components/dashboard/QuoteMainInfoCard';

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  rejection_reasons: { reason: string } | null;
};

const QuoteDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [isRejectDialogOpen, setRejectDialogOpen] = useState(false);
  const { 
    approveQuote, 
    rejectQuote, 
    addToCart, 
    isUpdating 
  } = useQuoteState(id || '');

  const { data: quote, isLoading, error } = useQuery({
    queryKey: ['quote', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('quotes')
        .select('*, quote_items(*), rejection_reasons(reason)')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data as QuoteWithItems;
    },
    enabled: !!id && !!user,
  });

  const steps = useQuoteSteps(quote);

  const handleConfirmRejection = (reasonId: string, details: string) => {
    if (!quote) return;
    rejectQuote(reasonId, details);
    setRejectDialogOpen(false);
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isLoading) {
    return (
      <div className="container py-12">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="container py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Quote Not Found</h1>
          <p className="text-muted-foreground">
            The quote you're looking for doesn't exist or you don't have permission to view it.
          </p>
        </div>
      </div>
    );
  }

  const canViewBreakdown = !isQuoteEditable(quote);

  return (
    <div className="container py-12 space-y-8">
      <QuoteMainInfoCard
        imageUrl={quote.quote_items[0]?.image_url}
        productName={quote.quote_items[0]?.product_name || 'Product'}
        quoteId={quote.display_id || quote.id.substring(0, 8)}
        status={quote.status}
        price={quote.final_total ? `${quote.final_total} ${quote.final_currency || 'USD'}` : '—'}
        eta={quote.eta || '3-7 days'}
        ctaLabel={quote.status === 'sent' ? 'Approve Quote' : 'Track Order'}
        onCtaClick={() => {
          if (quote.status === 'sent') approveQuote(quote.id);
          // else: tracking logic (not implemented here)
        }}
        ctaDisabled={isUpdating || quote.status !== 'sent'}
        hint={quote.status === 'sent' ? 'Review all details before payment.' : 'You can track your order status here.'}
        disclaimer={undefined} // Replace with backend disclaimer if available
      />
      <QuoteStepper steps={steps} className="mb-8" />
      
      {canViewBreakdown ? (
        <QuoteBreakdown 
          quote={quote} 
          onApprove={approveQuote}
          onReject={() => setRejectDialogOpen(true)}
          isProcessing={isUpdating}
          onAddToCart={addToCart}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Quote In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your quote is currently being prepared by our team. We will notify you once it's ready for review. You can use the messaging section below to communicate with us if you have any questions.
            </p>
          </CardContent>
        </Card>
      )}
      <QuoteMessaging quoteId={quote.id} quoteUserId={quote.user_id} />

      <CustomerRejectQuoteDialog
        isOpen={isRejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleConfirmRejection}
        isPending={isUpdating}
      />
    </div>
  );
};

export default QuoteDetails;
