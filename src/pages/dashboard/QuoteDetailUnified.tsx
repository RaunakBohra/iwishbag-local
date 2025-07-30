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
  
  const isSharedQuote = Boolean(shareToken);
  const quoteId = isSharedQuote ? shareToken : id;

  const {
    data: quote,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['unified-quote', quoteId, isSharedQuote],
    queryFn: async () => {
      if (!quoteId) throw new Error('No quote ID provided');

      let query = supabase
        .from('quotes')
        .select('*')
        .eq(isSharedQuote ? 'share_token' : 'id', quoteId)
        .single();

      const { data, error } = await query;
      if (error) throw error;
      return data as UnifiedQuote;
    },
    enabled: Boolean(quoteId),
  });

  // Simplified check for item data
  const hasItemData = useMemo(() => {
    if (!quote?.items) return false;
    const items = Array.isArray(quote.items) ? quote.items : [];
    return items.length > 0;
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
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Quote Not Found</h2>
          <p className="text-gray-600 mb-4">
            {error ? 'Failed to load quote details.' : 'The requested quote could not be found.'}
          </p>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quote Details</h1>
                <span className="text-xs text-gray-500">
                  Items: {quote?.items?.length || 0}
                </span>
              </div>
            </div>
            {statusConfig && (
              <Badge
                variant={statusConfig.variant as any}
                className={statusConfig.className}
              >
                {statusConfig.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quote Summary */}
          <div className="space-y-6">
            <QuoteSummary quote={quote} />
          </div>

          {/* Quote Breakdown */}
          <div className="space-y-6">
            <QuoteBreakdown quote={quote} />
          </div>
        </div>

        {/* Educational Content */}
        {hasItemData && (
          <div className="mt-8">
            <TaxBreakdownEducation 
              route={`${quote.origin_country}-${quote.destination_country}`}
              items={quote.items || []}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteDetailUnified;