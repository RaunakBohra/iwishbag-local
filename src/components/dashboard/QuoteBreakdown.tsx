import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

import { QuoteBreakdownHeader } from './QuoteBreakdownHeader';
import { QuoteBreakdownDetails } from './QuoteBreakdownDetails';
import { QuoteBreakdownApproval } from './QuoteBreakdownApproval';
import { QuoteItemCard } from './QuoteItemCard';
import { Banknote, Clock, ShoppingCart, Package, AlertCircle, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QuoteApprovalDialog } from './QuoteApprovalDialog';
import { QuoteStepper, QuoteStep } from './QuoteStepper';

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  rejection_reasons?: { reason: string } | null;
};

interface QuoteBreakdownProps {
  quote: QuoteWithItems;
  onApprove: (quoteId: string) => void;
  onReject: (reason: string) => void;
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
  const [isApprovalDialogOpen, setApprovalDialogOpen] = useState(false);
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

  // Determine current step in the flow
  const getCurrentStep = (): QuoteStep => {
    if (quote.status === 'sent' && quote.approval_status === 'pending') return 'review';
    if (quote.approval_status === 'approved' && !quote.in_cart) return 'approve';
    if (quote.in_cart) return 'cart';
    if (quote.payment_method) return 'checkout';
    return 'review';
  };

  const handleApproveClick = () => {
    setApprovalDialogOpen(true);
  };

  const handleApproveConfirm = () => {
    onApprove(quote.id);
    setApprovalDialogOpen(false);
  };

  const handleRejectConfirm = (reason: string) => {
    onReject(reason);
    setApprovalDialogOpen(false);
  };

  const handleAddToCart = () => {
    onAddToCart(quote.id);
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="pt-6 space-y-8">
        <QuoteStepper currentStep={getCurrentStep()} />
        
        <div className="space-y-6">
          <QuoteBreakdownHeader
            quote={quote}
            isItemsExpanded={isItemsExpanded}
            onToggleItems={() => setIsItemsExpanded(!isItemsExpanded)}
          />

          {isItemsExpanded && (
            <div className="space-y-4">
              {quote.quote_items?.map((item) => (
                <QuoteItemCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {showBreakdown && (
            <div className="space-y-6 pt-6 border-t">
              <QuoteBreakdownDetails quote={quote} countrySettings={countrySettings} />
              
              {canApproveReject && (
                <QuoteBreakdownApproval
                  canApproveReject={canApproveReject}
                  isProcessing={isProcessing}
                  quoteId={quote.id}
                  onApprove={handleApproveClick}
                  onReject={onReject}
                />
              )}

              {quote.approval_status === 'approved' && !quote.in_cart && (
                <div className="flex justify-end">
                  <Button onClick={handleAddToCart} disabled={isProcessing}>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                </div>
              )}

              {quote.in_cart && (
                <div className="flex justify-end">
                  <Button asChild>
                    <Link to="/cart">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Go to Cart
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <QuoteApprovalDialog
          isOpen={isApprovalDialogOpen}
          onClose={() => setApprovalDialogOpen(false)}
          onApprove={handleApproveConfirm}
          quoteTotal={quote.final_total || 0}
          isProcessing={isProcessing}
        />
      </CardContent>
    </Card>
  );
};
