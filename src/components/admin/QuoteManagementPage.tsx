import { CompactQuoteListItem } from './CompactQuoteListItem';
import { CreateQuoteModal } from './CreateQuoteModal';
import { RejectQuoteDialog } from './RejectQuoteDialog';
import { QuoteFilters } from './QuoteFilters';
import { QuoteMetrics } from './QuoteMetrics';
import { QuoteQuickFilters } from './QuoteQuickFilters';
import { useQuoteManagement } from '@/hooks/useQuoteManagement';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { StatusDebugger } from '../debug/StatusDebugger';

import { QuoteListHeader } from './QuoteListHeader';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Plus, Search, BarChart3, Filter } from 'lucide-react';
import { H1, H2, Body, BodySmall } from '@/components/ui/typography';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export const QuoteManagementPage = () => {
  const { getStatusConfig } = useStatusManagement();

  // Filter states managed in the page
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [purchaseCountryFilter, setPurchaseCountryFilter] = useState('all');
  const [shippingCountryFilter, setShippingCountryFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [amountRange, setAmountRange] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const {
    quotes,
    quotesLoading,
    isRejectDialogOpen,
    setRejectDialogOpen,
    selectedQuoteIds,
    handleToggleSelectQuote,
    handleToggleSelectAll,
    handleBulkAction,
    handleConfirmRejection,
    downloadCSV: _downloadCSV,
    handleQuoteCreated,
    isProcessing,
    isUpdatingStatus,
    updateMultipleQuotesRejectionIsPending,
    activeStatusUpdate,
    handleDeleteQuotes,
    isDeletingQuotes,
  } = useQuoteManagement({
    statusFilter,
    searchInput,
    purchaseCountryFilter,
    shippingCountryFilter,
    dateRange,
    amountRange,
    priorityFilter,
  });

  if (quotesLoading) {
    return (
      <div className="min-h-screen bg-gray-50/40">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-4 w-96 bg-gray-200 rounded animate-pulse" />
          </div>
          <QuoteMetrics quotes={[]} isLoading={true} />
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <Body className="text-gray-600">Loading quotes...</Body>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics using dynamic status configuration
  const totalQuotes = quotes?.length || 0;
  const pendingQuotes =
    quotes?.filter((q) => {
      const config = getStatusConfig(q.status, 'quote');
      return config?.allowApproval ?? q.status === 'pending'; // fallback
    }).length || 0;
  const approvedQuotes =
    quotes?.filter((q) => {
      const config = getStatusConfig(q.status, 'quote');
      return config?.allowCartActions ?? q.status === 'approved'; // fallback
    }).length || 0;
  const paidQuotes =
    quotes?.filter((q) => {
      const config = getStatusConfig(q.status, 'quote');
      return (
        config?.showInOrdersList ?? ['paid', 'ordered', 'shipped', 'completed'].includes(q.status)
      ); // fallback
    }).length || 0;
  const rejectedQuotes =
    quotes?.filter((q) => {
      const config = getStatusConfig(q.status, 'quote');
      return (config?.isTerminal && !config?.isSuccessful) ?? q.status === 'cancelled'; // fallback
    }).length || 0;
  const highPriorityQuotes = quotes?.filter(q => q.priority === 'high').length || 0;
  
  // Calculate quick filter counts
  const today = new Date().toISOString().split('T')[0];
  const todayQuotes = quotes?.filter(q => q.created_at.startsWith(today)).length || 0;
  
  const quoteCounts = {
    all: totalQuotes,
    today: todayQuotes,
    pending: pendingQuotes,
    approved: approvedQuotes,
    highPriority: highPriorityQuotes,
    overdue: 0, // This would need additional logic to calculate
    paid: paidQuotes,
    rejected: rejectedQuotes,
  };
  
  const totalValue = quotes?.reduce((sum, q) => sum + (q.final_total || 0), 0) || 0;
  const _averageValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

  // Get selected quotes for bulk actions
  const _selectedQuotes = quotes?.filter((q) => selectedQuoteIds.includes(q.id)) || [];

  // Clear all filters
  const clearAllFilters = () => {
    setSearchInput('');
    setStatusFilter('all');
    setDateRange('all');
    setAmountRange('all');
    setCountryFilter('all');
    setPriorityFilter('all');
  };

  // Confirmation dialog handlers
  const handleRequestBulkAction = (action: string) => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };
  const handleRequestDelete = () => {
    setConfirmAction('delete');
    setConfirmOpen(true);
  };
  const handleConfirm = () => {
    if (confirmAction === 'delete') {
      handleDeleteQuotes();
    } else if (confirmAction) {
      handleBulkAction(
        confirmAction as
          | 'approved'
          | 'cancelled'
          | 'confirm_payment'
          | 'email'
          | 'export'
          | 'duplicate'
          | 'priority',
      );
    }
    setConfirmOpen(false);
    setConfirmAction(null);
  };
  const _handleCancel = () => {
    setConfirmOpen(false);
    setConfirmAction(null);
  };

  // Apply quick filters
  const applyQuickFilter = (filter: string) => {
    setQuickFilter(filter);
    
    // Reset other filters when using quick filters
    setStatusFilter('all');
    setDateRange('all');
    setAmountRange('all');
    setCountryFilter('all');
    setPriorityFilter('all');
    setSearchInput('');
    
    // Apply the quick filter logic
    switch (filter) {
      case 'today':
        setDateRange('today');
        break;
      case 'pending':
        setStatusFilter('pending');
        break;
      case 'approved':
        setStatusFilter('approved');
        break;
      case 'high_priority':
        setPriorityFilter('high');
        break;
      case 'paid':
        setStatusFilter('paid');
        break;
      case 'rejected':
        setStatusFilter('rejected');
        break;
      default:
        // 'all' - no additional filters
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/40">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <H1 className="text-gray-900">Quote Management</H1>
                <BodySmall className="text-gray-600">Manage customer quotes and quote requests</BodySmall>
              </div>
            </div>
            <Button 
              onClick={() => setIsCreateModalOpen(true)} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Quote
            </Button>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <QuoteMetrics quotes={quotes || []} isLoading={quotesLoading} />

        {/* Main Content Card */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <H2 className="text-gray-900">Quotes</H2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search quotes by ID, customer, email, or product..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Quick Filters */}
            <QuoteQuickFilters
              activeFilter={quickFilter}
              onFilterChange={applyQuickFilter}
              quoteCounts={quoteCounts}
            />
          </div>

          {/* Advanced Filters (Collapsible) */}
          <Collapsible open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
            <CollapsibleContent>
              <div className="px-6 pb-4 border-b border-gray-200">
                <QuoteFilters
                  searchTerm={searchInput}
                  onSearchTermChange={setSearchInput}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  amountRange={amountRange}
                  onAmountRangeChange={setAmountRange}
                  countryFilter={countryFilter}
                  onCountryFilterChange={setCountryFilter}
                  priorityFilter={priorityFilter}
                  onPriorityFilterChange={setPriorityFilter}
                  onClearFilters={clearAllFilters}
                  purchaseCountryFilter={purchaseCountryFilter}
                  onPurchaseCountryFilterChange={setPurchaseCountryFilter}
                  shippingCountryFilter={shippingCountryFilter}
                  onShippingCountryFilterChange={setShippingCountryFilter}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* List Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <QuoteListHeader
              quotes={quotes}
              selectedQuoteIds={selectedQuoteIds}
              onToggleSelectAll={handleToggleSelectAll}
              onBulkAction={handleRequestBulkAction}
              isProcessing={isProcessing}
              isUpdatingStatus={isUpdatingStatus}
              activeStatusUpdate={activeStatusUpdate}
              onDeleteQuotes={handleRequestDelete}
              isDeletingQuotes={isDeletingQuotes}
            />
          </div>

          {/* Content */}
          <div className="p-6">
            {quotes && quotes.length > 0 ? (
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <CompactQuoteListItem
                    key={quote.id}
                    quote={quote}
                    isSelected={selectedQuoteIds.includes(quote.id)}
                    onSelect={handleToggleSelectQuote}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <H2 className="text-gray-900 mb-2">No quotes found</H2>
                <Body className="text-gray-600 mb-6">
                  {searchInput ||
                  statusFilter !== 'all' ||
                  dateRange !== 'all' ||
                  amountRange !== 'all' ||
                  countryFilter !== 'all' ||
                  priorityFilter !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'Get started by creating your first quote.'}
                </Body>
                {!searchInput &&
                  statusFilter === 'all' &&
                  dateRange === 'all' &&
                  amountRange === 'all' &&
                  countryFilter === 'all' &&
                  priorityFilter === 'all' && (
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Quote
                    </Button>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Quote Modal */}
      <CreateQuoteModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onQuoteCreated={(quoteId) => {
          handleQuoteCreated(quoteId);
        }}
      />

      <RejectQuoteDialog
        isOpen={isRejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onConfirm={handleConfirmRejection}
        isPending={updateMultipleQuotesRejectionIsPending}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'approved' && 'Approve Selected Quotes?'}
              {confirmAction === 'cancelled' && 'Reject Selected Quotes?'}
              {confirmAction === 'confirm_payment' && 'Confirm Payment for Selected Quotes?'}
              {confirmAction === 'export' && 'Export Selected Quotes?'}
              {confirmAction === 'priority' && 'Set Priority for Selected Quotes?'}
              {confirmAction === 'delete' && 'Delete Selected Quotes? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {confirmAction === 'approved' && 'Approve'}
              {confirmAction === 'cancelled' && 'Reject'}
              {confirmAction === 'confirm_payment' && 'Confirm Payment'}
              {confirmAction === 'export' && 'Export'}
              {confirmAction === 'priority' && 'Set Priority'}
              {confirmAction === 'delete' && 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Debug Component - Remove in production */}
      <StatusDebugger />
    </div>
  );
};
