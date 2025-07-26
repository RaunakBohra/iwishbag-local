import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, ShoppingCart, Info, Calculator, BookOpen, AlertCircle } from 'lucide-react';
import { QuoteSummary } from '@/components/dashboard/QuoteSummary';
import { QuoteBreakdown } from '@/components/dashboard/QuoteBreakdown';
import { TaxBreakdownEducation } from '@/components/dashboard/customer-education/TaxBreakdownEducation';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { useQuoteState } from '@/hooks/useQuoteState';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

type UnifiedQuote = Tables<'quotes'>;

interface QuoteDetailUnifiedProps {
  isShareToken?: boolean;
}

const QuoteDetailUnified: React.FC<QuoteDetailUnifiedProps> = ({ isShareToken = false }) => {
  const navigate = useNavigate();
  const { id, shareToken } = useParams<{ id?: string; shareToken?: string }>();
  const { getStatusConfig } = useStatusManagement();
  const { toast } = useToast();
  const [showHSNEducation, setShowHSNEducation] = useState(false);

  // Determine the quote ID and whether we're using a share token
  const quoteId = shareToken || id;
  const isSharedQuote = Boolean(shareToken);

  // Initialize quote state hook for operations (only if we have a valid quote ID)
  const quoteStateHook = useQuoteState(quoteId || '');

  // Fetch quote data
  const {
    data: quote,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['unified-quote', quoteId, isSharedQuote],
    queryFn: async () => {
      if (!quoteId) throw new Error('No quote ID provided');

      // For shared quotes, use a different endpoint that doesn't require auth
      if (isSharedQuote) {
        const { data, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('share_token', quoteId)
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', quoteId)
          .single();
        if (error) throw error;
        return data;
      }
    },
    enabled: Boolean(quoteId),
  });

  // Calculate if quote has HSN data
  const hasHSNData = useMemo(() => {
    if (!quote?.items) return false;
    const items = Array.isArray(quote.items) ? quote.items : [];
    return items.some((item: any) => {
      const hasHSN = item.hsn_code && item.hsn_code.trim() !== '';
      const hasCategory = item.category && item.category.trim() !== '';
      return hasHSN || hasCategory;
    });
  }, [quote?.items]);

  // Get status configuration
  const statusConfig = quote ? getStatusConfig(quote.status, 'quote') : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quote details...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Quote Not Found</h1>
          <p className="text-gray-600 mb-6">
            The quote you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button
            onClick={() => navigate(isShareToken ? '/' : '/dashboard')}
            className="inline-flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const handleApprove = async (quoteId: string) => {
    try {
      await quoteStateHook.approveQuote();
      toast({
        title: 'Quote Approved',
        description: 'Your quote has been approved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve quote. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (reason: string) => {
    try {
      await quoteStateHook.rejectQuote(reason);
      toast({
        title: 'Quote Rejected',
        description: 'Your quote has been rejected.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject quote. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAddToCart = async (quoteId: string) => {
    try {
      await quoteStateHook.addToCart();
      toast({
        title: 'Added to Cart',
        description: 'Quote has been added to your cart.',
      });
      navigate('/cart');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add quote to cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(isShareToken ? '/' : '/dashboard')}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Quote #{quote.display_id}</h1>
                <p className="text-sm text-gray-500">
                  {statusConfig?.label || quote.status} • {quote.destination_country}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasHSNData && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHSNEducation(!showHSNEducation)}
                  className="flex items-center"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  {showHSNEducation ? 'Hide' : 'Learn About'} HSN
                </Button>
              )}
              {/* Debug info - remove in production */}
              <span className="text-xs text-gray-500">
                HSN Data: {hasHSNData ? 'Yes' : 'No'} | Items: {quote?.items?.length || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* HSN Education Section - Always show if HSN data exists */}
        {hasHSNData && (
          <div className="space-y-4">
            {!showHSNEducation && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Info className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-900">
                      This quote uses HSN classification for accurate tax calculation
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHSNEducation(true)}
                    className="text-blue-600 border-blue-300 hover:bg-blue-100"
                  >
                    Learn More
                  </Button>
                </div>
              </div>
            )}

            {showHSNEducation && (
              <div className="space-y-4">
                <TaxBreakdownEducation
                  originCountry={quote.origin_country}
                  destinationCountry={quote.destination_country}
                />
              </div>
            )}
          </div>
        )}

        {/* Quote Breakdown */}
        <QuoteBreakdown
          quote={quote as any}
          onApprove={handleApprove}
          onReject={handleReject}
          onCalculate={() => {}}
          onRecalculate={() => {}}
          onSave={() => {}}
          onCancel={() => {}}
          isProcessing={false}
          onAddToCart={handleAddToCart}
          addToCartText="Add to Cart"
        />
      </div>
    </div>
  );
};

export default QuoteDetailUnified;
