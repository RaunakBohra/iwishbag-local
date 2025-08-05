import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CompactQuoteListItem } from '@/components/admin/CompactQuoteListItem';
import { CompactQuoteMetrics } from '@/components/admin/CompactQuoteMetrics';
import { BatchProcessingModal } from '@/components/admin/BatchProcessingModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, RefreshCw, Clock, AlertTriangle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBatchProcessing } from '@/hooks/useBatchProcessing';

const QuotesListPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);
  
  // Batch processing hook
  const batchProcessing = useBatchProcessing();

  // Fetch all quotes without any status filtering
  const { data: quotes = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-quotes-list', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('quotes_v2')
        .select(`
          *
        `)
        .order('created_at', { ascending: false })
        .limit(200); // Increased limit to show more quotes

      // Apply search filter only - V2 uses different fields
      if (searchTerm) {
        query = query.or(`id.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Map V2 quotes to UnifiedQuote format for compatibility
      const mappedQuotes = (data || []).map(quote => {
        // Calculate expiry status
        const getExpiryStatus = (expiresAt: string | null) => {
          if (!expiresAt) return null;
          
          const now = new Date();
          const expiry = new Date(expiresAt);
          const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysLeft < 0) {
            return { status: 'expired', text: 'Expired', variant: 'destructive' };
          } else if (daysLeft <= 1) {
            return { status: 'expiring', text: 'Expires today', variant: 'destructive' };
          } else if (daysLeft <= 3) {
            return { status: 'expiring-soon', text: `${daysLeft} days left`, variant: 'secondary' };
          } else {
            return { status: 'valid', text: `${daysLeft} days left`, variant: 'outline' };
          }
        };

        return {
          ...quote,
          final_total_usd: quote.total_usd || 0,
          costprice_total_usd: quote.items?.reduce((sum: number, item: any) => 
            sum + (item.costprice_origin || 0) * (item.quantity || 1), 0) || 0,
          customer_data: {
            info: {
              name: quote.customer_name,
              email: quote.customer_email,
              phone: quote.customer_phone,
            }
          },
          // Add expiry info for display
          expiry_status: getExpiryStatus(quote.expires_at),
          has_share_token: !!quote.share_token,
          email_sent: quote.email_sent || false,
        };
      });
      
      return mappedQuotes;
    },
    staleTime: 30000, // 30 seconds
  });

  // Calculate metrics (ensure quotes is always an array)
  const safeQuotes = quotes || [];
  const metrics = {
    total: safeQuotes.length,
    pending: safeQuotes.filter(q => q.status === 'pending').length,
    sent: safeQuotes.filter(q => q.status === 'sent').length,
    approved: safeQuotes.filter(q => q.status === 'approved').length,
    paid: safeQuotes.filter(q => q.status === 'paid').length,
    completed: safeQuotes.filter(q => q.status === 'completed').length,
    totalValue: safeQuotes.reduce((sum, q) => sum + (q.final_total_usd || 0), 0),
  };

  // Count quotes that need batch processing
  const draftPendingQuotes = safeQuotes.filter(q => 
    (q.status === 'draft' || q.status === 'pending') &&
    q.items && 
    Array.isArray(q.items) &&
    q.items.some((item: any) => 
      item.url && 
      item.url.trim() !== '' &&
      (!item.name || !item.costprice_origin)
    )
  );

  // Debug logging for batch processing (can be removed in production)
  console.log('🔍 Batch Processing:', {
    totalQuotes: safeQuotes.length,
    draftPendingCount: safeQuotes.filter(q => q.status === 'draft' || q.status === 'pending').length,
    quotesNeedingProcessing: draftPendingQuotes.length
  });

  const handleBatchProcessing = async () => {
    setShowBatchModal(true);
    if (!batchProcessing.isProcessing) {
      await batchProcessing.startProcessing();
    }
  };

  const handleCloseBatchModal = () => {
    if (!batchProcessing.isProcessing) {
      setShowBatchModal(false);
      // Refresh quotes after processing to show updated statuses
      refetch();
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">All Quotes</h1>
        <p className="text-muted-foreground mt-2">View and manage all quotes regardless of status</p>
      </div>

      {/* Metrics */}
      <CompactQuoteMetrics metrics={metrics} />

      {/* Search Bar */}
      <Card className="w-full">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search by tracking ID or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleBatchProcessing}
                disabled={draftPendingQuotes.length === 0 || batchProcessing.isProcessing}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Zap className={`w-4 h-4 mr-2 ${batchProcessing.isProcessing ? 'animate-spin' : ''}`} />
                Process All Drafts
                {draftPendingQuotes.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-white bg-opacity-20 rounded-full text-xs">
                    {draftPendingQuotes.length}
                  </span>
                )}
              </Button>
              <Button onClick={() => navigate('/quote')}>
                <Plus className="w-4 h-4 mr-2" />
                New Quote
              </Button>
            </div>
          </CardContent>
        </Card>

      {/* Quote List */}
      <Card className="w-full">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              Loading quotes...
            </div>
          ) : safeQuotes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No quotes found
            </div>
          ) : (
            <div className="divide-y">
              {safeQuotes.map((quote) => (
                <CompactQuoteListItem
                  key={quote.id}
                  quote={quote}
                  onQuoteClick={(quoteId) => navigate(`/admin/quote-calculator-v2/${quoteId}`)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Processing Modal */}
      <BatchProcessingModal
        isOpen={showBatchModal}
        onClose={handleCloseBatchModal}
        isProcessing={batchProcessing.isProcessing}
        progress={batchProcessing.progress}
        results={batchProcessing.results}
        onStart={batchProcessing.startProcessing}
        onCancel={batchProcessing.cancelProcessing}
        canStart={draftPendingQuotes.length > 0}
      />
    </div>
  );
};

export default QuotesListPage;