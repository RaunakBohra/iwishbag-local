import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuotesPaginated } from '@/hooks/useQuotes';
import { CompactQuoteListItem } from '@/components/admin/CompactQuoteListItem';
import { CompactQuoteMetrics } from '@/components/admin/CompactQuoteMetrics';
import { BatchProcessingModal } from '@/components/admin/BatchProcessingModal';
import { QuotePaginationControls } from '@/components/admin/QuotePaginationControls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Plus, RefreshCw, Clock, AlertTriangle, Zap, Edit, MessageCircle, CheckCircle, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBatchProcessing } from '@/hooks/useBatchProcessing';

const QuotesListPage: React.FC = () => {
  console.log('🎯 QuotesListPage component loaded - no auth dependencies');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state from URL parameters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [reviewSectionExpanded, setReviewSectionExpanded] = useState(true);
  const [showBatchModal, setShowBatchModal] = useState(false);
  
  // Pagination state from URL
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [pageSize, setPageSize] = useState(Number(searchParams.get('pageSize')) || 25);
  
  // Batch processing hook
  const batchProcessing = useBatchProcessing();

  // Function to update URL parameters
  const updateURL = (updates: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || (key === 'page' && value === 1) || (key === 'pageSize' && value === 25)) {
        // Remove default values from URL to keep it clean
        newParams.delete(key);
      } else {
        newParams.set(key, value.toString());
      }
    });
    
    setSearchParams(newParams, { replace: true });
  };

  // Build filters for the paginated query
  const filters = {
    search: searchTerm || undefined,
  };

  // Fetch paginated quotes
  const { data: paginatedData, isLoading, refetch } = useQuotesPaginated(filters, currentPage, pageSize);
  const quotes = paginatedData?.data || [];
  const pagination = paginatedData?.pagination || {
    total: 0,
    page: currentPage,
    pageSize,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  };

  // Calculate metrics and organize quotes by priority
  const safeQuotes = quotes || [];
  
  // Use quotes in database order (already sorted by created_at DESC)
  const prioritizedQuotes = safeQuotes;
  
  // Group quotes by category for organized display
  const quoteGroups = {
    reviewRequests: prioritizedQuotes.filter(q => q.status === 'under_review'),
    awaitingCustomer: prioritizedQuotes.filter(q => q.status === 'sent'),
    readyToProcess: prioritizedQuotes.filter(q => q.status === 'approved'),
    inProgress: prioritizedQuotes.filter(q => ['draft', 'calculated', 'pending'].includes(q.status)),
    completed: prioritizedQuotes.filter(q => ['rejected', 'expired', 'paid', 'ordered', 'shipped', 'completed', 'cancelled'].includes(q.status))
  };
  
  const metrics = {
    total: pagination.total, // Use total from pagination, not current page data
    under_review: safeQuotes.filter(q => q.status === 'under_review').length,
    pending: safeQuotes.filter(q => q.status === 'pending').length,
    sent: safeQuotes.filter(q => q.status === 'sent').length,
    approved: safeQuotes.filter(q => q.status === 'approved').length,
    paid: safeQuotes.filter(q => q.status === 'paid').length,
    completed: safeQuotes.filter(q => q.status === 'completed').length,
    totalValue: safeQuotes.reduce((sum, q) => sum + (q.final_total_origincurrency || 0), 0),
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL({ page });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
    updateURL({ pageSize: newPageSize, page: 1 });
  };

  // Search handler
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
    updateURL({ search: value, page: 1 });
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
                    onChange={(e) => handleSearchChange(e.target.value)}
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

      {/* Quote Sections */}
      {isLoading ? (
        <Card className="w-full">
          <CardContent className="p-8 text-center text-muted-foreground">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            Loading quotes...
          </CardContent>
        </Card>
      ) : pagination.total === 0 ? (
        <Card className="w-full">
          <CardContent className="p-8 text-center text-muted-foreground">
            No quotes found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Review Requests Section - Collapsible */}
          {quoteGroups.reviewRequests.length > 0 && (
            <Collapsible open={reviewSectionExpanded} onOpenChange={setReviewSectionExpanded}>
              <Card className="border-amber-200 bg-amber-50">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-amber-100/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg text-amber-900">🚨 Review Requests</CardTitle>
                        <p className="text-sm text-amber-700">Customer feedback requires immediate attention</p>
                      </div>
                      <Badge className="bg-amber-600 text-white text-lg px-3 py-1">
                        {quoteGroups.reviewRequests.length}
                      </Badge>
                      <div className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-amber-200 transition-colors">
                        {reviewSectionExpanded ? (
                          <ChevronUp className="w-4 h-4 text-amber-700" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-amber-700" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-0">
                    <div className="divide-y divide-amber-200">
                      {quoteGroups.reviewRequests.map((quote) => (
                        <div key={quote.id} className="relative">
                          {/* Urgency indicator */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                            quote.review_request_data?.urgency === 'high' ? 'bg-red-500' :
                            quote.review_request_data?.urgency === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                          }`} />
                          <div className="pl-4">
                            <CompactQuoteListItem
                              quote={quote}
                              onQuoteClick={(quoteId) => navigate(`/admin/quote-calculator-v2/${quoteId}`)}
                            />
                            {/* Review request summary */}
                            <div className="px-4 pb-3 bg-white border-t border-amber-200">
                              <div className="flex items-center gap-4 text-sm">
                                <Badge className={`${
                                  quote.review_request_data?.urgency === 'high' ? 'bg-red-100 text-red-700' :
                                  quote.review_request_data?.urgency === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {quote.review_request_data?.urgency?.toUpperCase()} PRIORITY
                                </Badge>
                                <span className="text-gray-600">
                                  {quote.review_request_data?.category?.replace('_', ' ')?.toUpperCase()}
                                </span>
                                <span className="text-gray-500">
                                  {quote.review_requested_at && 
                                    `${Math.round((Date.now() - new Date(quote.review_requested_at).getTime()) / (1000 * 60 * 60))}h ago`
                                  }
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                                {quote.review_request_data?.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* All Quotes Section */}
          <Card className="w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">All Quotes</CardTitle>
                  <p className="text-sm text-gray-600">Complete list of quotes sorted by priority</p>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {pagination.total} Total
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {prioritizedQuotes.map((quote) => (
                  <CompactQuoteListItem
                    key={quote.id}
                    quote={quote}
                    onQuoteClick={(quoteId) => navigate(`/admin/quote-calculator-v2/${quoteId}`)}
                  />
                ))}
              </div>
            </CardContent>
            
            {/* Pagination Controls */}
            {pagination.total > 0 && (
              <QuotePaginationControls
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                pageSize={pagination.pageSize}
                total={pagination.total}
                hasNext={pagination.hasNext}
                hasPrev={pagination.hasPrev}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                isLoading={isLoading}
              />
            )}
          </Card>
        </div>
      )}

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