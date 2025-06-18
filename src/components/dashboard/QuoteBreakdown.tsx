import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { QuoteSummary } from './QuoteSummary';
import { CustomerRejectQuoteDialog } from './CustomerRejectQuoteDialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { HelpCircle, MessageCircle, XCircle, BookOpen, Edit2 } from 'lucide-react';
import { QuoteMessaging } from '../messaging/QuoteMessaging';
import { formatAmountForDisplay } from '@/lib/currencyUtils';

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  rejection_reasons?: { reason: string } | null;
};

interface QuoteBreakdownProps {
  quote: QuoteWithItems;
  onApprove: (quoteId: string) => void;
  onReject: (reason: string) => void;
  onCalculate: (quoteId: string) => void;
  onRecalculate: (quoteId: string) => void;
  onSave: (quoteId: string) => void;
  onCancel: (quoteId: string) => void;
  isProcessing: boolean;
  onAddToCart?: (quoteId: string) => void;
}

// Mapping function for quote state
function getQuoteUIState(quote) {
  const { status, approval_status, in_cart } = quote;
  let step: 'review' | 'approve' | 'cart' | 'checkout' | 'rejected' = 'review';
  let summaryStatus: 'pending' | 'approved' | 'rejected' | 'in_cart' = 'pending';
  let canApprove = false;
  let canReject = false;
  let canAddToCart = false;
  let canGoToCart = false;
  let canReApprove = false;
  let showCancelLink = false;

  if ((status === 'calculated' || status === 'sent') && approval_status === 'pending') {
    step = 'review';
    summaryStatus = 'pending';
    canApprove = true;
    canReject = true;
    showCancelLink = true;
  } else if (status === 'accepted' && approval_status === 'approved' && !in_cart) {
    step = 'approve';
    summaryStatus = 'approved';
    canAddToCart = true;
    showCancelLink = true;
  } else if ((status === 'accepted' || status === 'paid' || status === 'ordered' || status === 'shipped' || status === 'completed') && approval_status === 'approved' && in_cart) {
    step = 'cart';
    summaryStatus = 'in_cart';
    canGoToCart = true;
    showCancelLink = true;
  } else if (status === 'cancelled' || approval_status === 'rejected') {
    step = 'rejected';
    summaryStatus = 'rejected';
    canReApprove = true;
  } else if (status === 'paid' || status === 'ordered' || status === 'shipped' || status === 'completed') {
    step = 'checkout';
    summaryStatus = 'approved';
  }

  return { step, summaryStatus, canApprove, canReject, canAddToCart, canGoToCart, canReApprove, showCancelLink };
}

export function QuoteBreakdown({ quote, onApprove, onReject, onCalculate, onRecalculate, onSave, onCancel, onAddToCart }: QuoteBreakdownProps) {
  const [isItemsExpanded, setIsItemsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApprovalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [isRejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isMobileHelpOpen, setMobileHelpOpen] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const queryClient = useQueryClient();

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const { data: countrySettings } = useQuery({
    queryKey: ['country-settings', quote.country_code],
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

  // Refresh quote data when component mounts or when returning to the page
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['quote', quote.id] });
  }, [quote.id, queryClient]);

  const hasCalculation = quote.final_total !== null;
  const showBreakdown = hasCalculation && (quote.status === 'sent' || quote.approval_status === 'approved' || quote.approval_status === 'rejected' || quote.status === 'accepted');
  
  // Use the same currency conversion logic for both breakdown and summary
  const quoteTotal = useMemo(() => {
    if (!quote.final_total) return 0;
    return typeof quote.final_total === 'string' ? parseFloat(quote.final_total) : quote.final_total;
  }, [quote.final_total]);

  const handleApproveClick = () => {
    setApprovalDialogOpen(true);
  };

  const handleApproveConfirm = async () => {
    setIsProcessing(true);
    try {
      await onApprove(quote.id);
      setApprovalDialogOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSummary = () => {
    setRejectDialogOpen(true);
  };

  const handleAddToCart = () => {
    onAddToCart(quote.id);
  };

  const handleReApprove = () => {
    onApprove(quote.id);
  };

  const handleMessageSupport = () => {
    setHelpOpen(false);
    setMobileHelpOpen(false);
    setShowMessages(true);
  };
  const handleFAQ = () => {
    setHelpOpen(false);
    setMobileHelpOpen(false);
    // Open FAQ modal or link
    window.open('/faq', '_blank');
  };
  const handleRequestChanges = () => {
    setHelpOpen(false);
    setMobileHelpOpen(false);
    // Open request changes form/modal
    // e.g., setShowRequestChanges(true)
  };
  const handleCancelQuote = () => {
    setHelpOpen(false);
    setMobileHelpOpen(false);
    handleRejectSummary();
  };

  const uiState = getQuoteUIState(quote);

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="pt-6 space-y-8">
        <QuoteStepper currentStep={uiState.step} rejected={uiState.step === 'rejected'} />
        <QuoteSummary
          status={uiState.summaryStatus}
          total={quoteTotal}
          itemCount={quote.quote_items?.length || 0}
          onApprove={uiState.canApprove ? handleApproveClick : undefined}
          isProcessing={isProcessing}
          countryCode={quote.country_code}
          renderActions={() => (
            <>
              {uiState.canAddToCart && (
                <Button onClick={handleAddToCart} disabled={isProcessing} className="ml-2">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              )}
              {uiState.canGoToCart && (
                <Button asChild className="ml-2">
                  <Link to="/cart">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Go to Cart
                  </Link>
                </Button>
              )}
              {uiState.canReApprove && (
                <Button onClick={handleReApprove} disabled={isProcessing} className="ml-2">
                  Re-Approve Quote
                </Button>
              )}
            </>
          )}
        />
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
            </div>
          )}
        </div>
        <QuoteApprovalDialog
          isOpen={isApprovalDialogOpen}
          onClose={() => setApprovalDialogOpen(false)}
          onApprove={handleApproveConfirm}
          quoteTotal={quoteTotal}
          isProcessing={isProcessing}
        />
        <CustomerRejectQuoteDialog
          isOpen={isRejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          onConfirm={(reasonId, details) => {
            onReject(reasonId || details || '');
            setRejectDialogOpen(false);
          }}
          isPending={isProcessing}
        />
        {/* Need Help? menu - moved between breakdown and messages */}
        <div className="flex justify-center py-4 border-t border-b">
          <div className="md:block hidden">
            <Popover open={isHelpOpen} onOpenChange={setHelpOpen}>
              <PopoverTrigger asChild>
                <button className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1" type="button">
                  <HelpCircle className="w-4 h-4" /> Need Help?
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-56 p-2">
                <button className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-muted/50 text-sm" onClick={handleMessageSupport}>
                  <MessageCircle className="w-4 h-4" /> Message Support
                </button>
                <button className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-muted/50 text-sm" onClick={handleCancelQuote}>
                  <XCircle className="w-4 h-4 text-destructive" /> Cancel Quote
                </button>
                <button className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-muted/50 text-sm" onClick={handleFAQ}>
                  <BookOpen className="w-4 h-4" /> FAQ
                </button>
                <button className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-muted/50 text-sm" onClick={handleRequestChanges}>
                  <Edit2 className="w-4 h-4" /> Request Changes
                </button>
              </PopoverContent>
            </Popover>
          </div>
          <div className="md:hidden block w-full">
            <button
              className="w-full text-sm text-muted-foreground hover:text-primary flex items-center gap-1 justify-center py-2"
              type="button"
              onClick={() => setMobileHelpOpen(true)}
            >
              <HelpCircle className="w-4 h-4" /> Need Help?
            </button>
            <Dialog open={isMobileHelpOpen} onOpenChange={setMobileHelpOpen}>
              <DialogContent className="p-0 w-full max-w-[100vw] rounded-t-xl fixed bottom-0 left-0 right-0 mx-auto transform translate-y-0">
                <div className="flex flex-col divide-y">
                  <button 
                    className="flex items-center gap-2 w-full px-4 py-4 text-base hover:bg-muted/50 active:bg-muted/70 transition-colors" 
                    onClick={handleMessageSupport}
                  >
                    <MessageCircle className="w-5 h-5" /> Message Support
                  </button>
                  <button 
                    className="flex items-center gap-2 w-full px-4 py-4 text-base hover:bg-muted/50 active:bg-muted/70 transition-colors" 
                    onClick={handleCancelQuote}
                  >
                    <XCircle className="w-5 h-5 text-destructive" /> Cancel Quote
                  </button>
                  <button 
                    className="flex items-center gap-2 w-full px-4 py-4 text-base hover:bg-muted/50 active:bg-muted/70 transition-colors" 
                    onClick={handleFAQ}
                  >
                    <BookOpen className="w-5 h-5" /> FAQ
                  </button>
                  <button 
                    className="flex items-center gap-2 w-full px-4 py-4 text-base hover:bg-muted/50 active:bg-muted/70 transition-colors" 
                    onClick={handleRequestChanges}
                  >
                    <Edit2 className="w-5 h-5" /> Request Changes
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {/* Messages section - only shown when Message Support is clicked */}
        {showMessages && (
          <div className="space-y-4">
            <QuoteMessaging quoteId={quote.id} quoteUserId={quote.user_id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
