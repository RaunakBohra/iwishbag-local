import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStatusManagement } from '@/hooks/useStatusManagement';

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
  addToCartText?: string;
}

// DEPRECATED: Legacy function moved inside component for dynamic access

export function QuoteBreakdown({ quote, onApprove, onReject, onCalculate, onRecalculate, onSave, onCancel, onAddToCart, addToCartText }: QuoteBreakdownProps) {
  const { getStatusConfig } = useStatusManagement();
  const [isItemsExpanded, setIsItemsExpanded] = useState(true);

  // DYNAMIC: Quote UI state mapping using status management configuration
  const getQuoteUIState = useMemo(() => {
    const { status, in_cart } = quote;
    const statusConfig = getStatusConfig(status, 'quote');
    
    let step: 'review' | 'approve' | 'cart' | 'checkout' | 'rejected' = 'review';
    let summaryStatus: 'pending' | 'approved' | 'rejected' | 'in_cart' = 'pending';
    
    // Use dynamic configuration or fallback to hardcoded logic
    if (statusConfig) {
      // Determine step based on status configuration
      if (statusConfig.isTerminal && !statusConfig.isSuccessful) {
        step = 'rejected';
        summaryStatus = 'rejected';
      } else if (statusConfig.allowCartActions && !in_cart) {
        step = 'approve';
        summaryStatus = 'approved';
      } else if (statusConfig.allowCartActions && in_cart) {
        step = 'cart';
        summaryStatus = 'in_cart';
      } else if (statusConfig.allowApproval) {
        step = 'approve';
        summaryStatus = 'pending';
      } else if (statusConfig.showInOrdersList) {
        step = 'checkout';
        summaryStatus = 'approved';
      } else {
        step = 'review';
        summaryStatus = 'pending';
      }
    } else {
      // FALLBACK: Legacy hardcoded logic
      if (status === 'pending') {
        step = 'review';
        summaryStatus = 'pending';
      } else if (status === 'sent') {
        step = 'approve';
        summaryStatus = 'pending';
      } else if (status === 'approved' && !in_cart) {
        step = 'approve';
        summaryStatus = 'approved';
      } else if (status === 'approved' && in_cart) {
        step = 'cart';
        summaryStatus = 'in_cart';
      } else if (status === 'rejected') {
        step = 'rejected';
        summaryStatus = 'rejected';
      } else if (statusConfig && statusConfig.countsAsOrder) {
        step = 'checkout';
        summaryStatus = 'approved';
      } else {
        step = 'review';
        summaryStatus = 'pending';
      }
    }
    
    return { step, summaryStatus, rejected: step === 'rejected' };
  }, [quote, getStatusConfig]);
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
    queryKey: ['country-settings', quote.destination_country],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('country_settings')
        .select('*')
        .eq('code', quote.destination_country)
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
  const showBreakdown = hasCalculation; // Always show breakdown if there's a calculation
  
  // Use the same currency conversion logic for both breakdown and summary
  const quoteTotal = useMemo(() => {
    if (!quote.final_total) return 0;
    // Ensure we're using the exact same value as shown in the breakdown
    return quote.final_total;
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

  const uiState = getQuoteUIState;

  return (
    <Card className="w-full overflow-hidden bg-card border border-border">
      <CardContent className="pt-4 sm:pt-6 space-y-6 sm:space-y-8 pb-mobile-safe md:pb-6">
        {/* <QuoteStepper currentStep={uiState.step} rejected={uiState.step === 'rejected'} /> */}
        <QuoteSummary
          status={uiState.summaryStatus}
          total={quoteTotal}
          itemCount={quote.quote_items?.length || 0}
          onApprove={uiState.step === 'approve' || (statusConfig?.allowApproval ?? false) ? handleApproveClick : undefined}
          onReject={statusConfig?.allowRejection ?? false ? handleRejectSummary : undefined}
          isProcessing={isProcessing}
          countryCode={quote.destination_country}
          renderActions={() => (
            <>
              {quote.status !== 'rejected' && (
                <Button onClick={handleAddToCart} disabled={isProcessing} className="ml-1.5 sm:ml-2 bg-foreground text-background hover:bg-foreground/90 px-3 py-1.5 h-auto text-sm">
                  <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  {addToCartText || "Add to Cart"}
                </Button>
              )}
              {quote.status !== 'rejected' && (
                <Button asChild className="ml-1.5 sm:ml-2 bg-foreground text-background hover:bg-foreground/90 px-3 py-1.5 h-auto text-sm">
                  <Link to="/cart">
                    <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    Go to Cart
                  </Link>
                </Button>
              )}
              {quote.status !== 'rejected' && (
                <Button onClick={handleReApprove} disabled={isProcessing} className="ml-1.5 sm:ml-2 bg-foreground text-background hover:bg-foreground/90 px-3 py-1.5 h-auto text-sm">
                  Re-Approve Quote
                </Button>
              )}
            </>
          )}
        />
        <div className="space-y-4 sm:space-y-6">
          {/* <QuoteBreakdownHeader
            quote={quote}
            isItemsExpanded={isItemsExpanded}
            onToggleItems={() => setIsItemsExpanded(!isItemsExpanded)}
          /> */}
          {isItemsExpanded && (
            <div className="space-y-3 sm:space-y-4">
              {quote.quote_items?.map((item) => (
                <QuoteItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
          {showBreakdown && (
            <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-6 border-t border-white/30">
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
          onOpenChange={(open) => {
            // Only allow closing if not submitting
            if (!isProcessing) {
              setRejectDialogOpen(open);
            }
          }}
          onConfirm={async (reasonId, details) => {
            try {
              await onReject(reasonId || details || '');
              setRejectDialogOpen(false);
            } catch (error) {
              // Keep dialog open on error
              console.error('Error rejecting quote:', error);
            }
          }}
          isPending={isProcessing}
        />
        {/* Need Help? menu - moved between breakdown and messages */}
        <div className="flex justify-center py-3 sm:py-4 border-t border-b border-border">
          <div className="md:block hidden">
            <Popover open={isHelpOpen} onOpenChange={setHelpOpen}>
              <PopoverTrigger asChild>
                <button className="text-base font-medium flex items-center gap-1 text-red-600 dark:text-red-400 bg-transparent border-none shadow-none px-0 py-0 hover:bg-transparent hover:text-red-500 focus:outline-none focus:ring-0" type="button">
                  <HelpCircle className="w-5 h-5 text-red-600 dark:text-red-400" /> Need Help?
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-56 p-2 backdrop-blur-xl bg-white/95 border border-white/30 shadow-2xl">
                <button className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-white/20 text-sm transition-colors duration-300 text-gray-700" onClick={handleMessageSupport}>
                  <MessageCircle className="w-4 h-4" /> Message Support
                </button>
                {quote.status !== 'rejected' && (
                  <button className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-white/20 text-sm transition-colors duration-300 text-red-600" onClick={handleCancelQuote}>
                    <XCircle className="w-4 h-4" /> Cancel Quote
                  </button>
                )}
                <button className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-white/20 text-sm transition-colors duration-300 text-gray-700" onClick={handleFAQ}>
                  <BookOpen className="w-4 h-4" /> FAQ
                </button>
                <button className="flex items-center gap-2 w-full px-2 py-2 rounded hover:bg-white/20 text-sm transition-colors duration-300 text-gray-700" onClick={handleRequestChanges}>
                  <Edit2 className="w-4 h-4" /> Request Changes
                </button>
              </PopoverContent>
            </Popover>
          </div>
          <div className="md:hidden block w-full">
            <button
              className="w-full text-sm sm:text-base font-medium flex items-center gap-1 justify-center py-2 text-red-600 dark:text-red-400 bg-transparent border-none shadow-none hover:bg-transparent hover:text-red-500 focus:outline-none focus:ring-0"
              type="button"
              onClick={() => setMobileHelpOpen(true)}
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 dark:text-red-400" /> Need Help?
            </button>
            <Dialog open={isMobileHelpOpen} onOpenChange={setMobileHelpOpen}>
              <DialogContent className="sm:max-w-[300px] backdrop-blur-xl bg-white/95 border border-white/30 shadow-2xl">
                <div className="flex flex-col divide-y divide-white/20">
                  <button 
                    className="flex items-center gap-2 w-full px-3 py-3 text-sm hover:bg-white/20 active:bg-white/30 transition-colors duration-300 text-gray-700" 
                    onClick={handleMessageSupport}
                  >
                    <MessageCircle className="w-4 h-4" /> Message Support
                  </button>
                  {quote.status !== 'rejected' && (
                    <button 
                      className="flex items-center gap-2 w-full px-3 py-3 text-sm hover:bg-white/20 active:bg-white/30 transition-colors duration-300 text-red-600" 
                      onClick={handleCancelQuote}
                    >
                      <XCircle className="w-4 h-4" /> Cancel Quote
                    </button>
                  )}
                  <button 
                    className="flex items-center gap-2 w-full px-3 py-3 text-sm hover:bg-white/20 active:bg-white/30 transition-colors duration-300 text-gray-700" 
                    onClick={handleFAQ}
                  >
                    <BookOpen className="w-4 h-4" /> FAQ
                  </button>
                  <button 
                    className="flex items-center gap-2 w-full px-3 py-3 text-sm hover:bg-white/20 active:bg-white/30 transition-colors duration-300 text-gray-700" 
                    onClick={handleRequestChanges}
                  >
                    <Edit2 className="w-4 h-4" /> Request Changes
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
