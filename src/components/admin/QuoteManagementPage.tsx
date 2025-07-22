import { CompactQuoteListItem } from './CompactQuoteListItem';
import { CreateQuoteModal } from './CreateQuoteModal';
import { RejectQuoteDialog } from './RejectQuoteDialog';
import { QuoteMetrics } from './QuoteMetrics';
import { SearchAndFilterPanel, SearchFilters, StatusOption, CountryOption } from './SearchAndFilterPanel';
import { useQuoteManagement } from '@/hooks/useQuoteManagement';
import { useStatusManagement } from '@/hooks/useStatusManagement';

import { QuoteListHeader } from './QuoteListHeader';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Plus, Search, BarChart3 } from 'lucide-react';
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

export const QuoteManagementPage = () => {
  const { getStatusConfig } = useStatusManagement();

  // New unified filter state
  const [filters, setFilters] = useState<SearchFilters>({
    searchText: '',
    statuses: [],
    countries: []
  });
  
  // Available filter options (populated from database)
  const [availableStatuses, setAvailableStatuses] = useState<StatusOption[]>([]);
  const [availableCountries, setAvailableCountries] = useState<CountryOption[]>([]);
  const [isLoadingFilterOptions, setIsLoadingFilterOptions] = useState(true);
  
  // UI state
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch available filter options from database
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        setIsLoadingFilterOptions(true);
        
        // Single optimized query to get both status and country data
        // This reduces server load and prevents resource exhaustion
        const { data: quotes, error } = await supabase
          .from('quotes')
          .select('status, destination_country')
          .not('status', 'is', null)
          .not('destination_country', 'is', null)
          .limit(1000); // Reasonable limit to prevent overwhelming the server

        if (error) {
          // Provide fallback options to ensure UI remains functional
          setAvailableStatuses([
            { value: 'pending', label: 'Pending', count: 0 },
            { value: 'sent', label: 'Sent', count: 0 },
            { value: 'approved', label: 'Approved', count: 0 },
            { value: 'rejected', label: 'Rejected', count: 0 },
            { value: 'paid', label: 'Paid', count: 0 }
          ]);
          setAvailableCountries([
            { code: 'IN', name: 'India', flag: '🇮🇳', count: 0 },
            { code: 'NP', name: 'Nepal', flag: '🇳🇵', count: 0 },
            { code: 'US', name: 'United States', flag: '🇺🇸', count: 0 }
          ]);
          return;
        }

        // Process data only if we have results
        if (!quotes || quotes.length === 0) {
          setAvailableStatuses([]);
          setAvailableCountries([]);
          return;
        }

        // Process statuses with counts
        const statusCounts: Record<string, number> = {};
        const countryCounts: Record<string, number> = {};

        quotes.forEach(quote => {
          if (quote.status) {
            statusCounts[quote.status] = (statusCounts[quote.status] || 0) + 1;
          }
          if (quote.destination_country) {
            countryCounts[quote.destination_country] = (countryCounts[quote.destination_country] || 0) + 1;
          }
        });

        // Create status options
        const statusOptions: StatusOption[] = Object.entries(statusCounts).map(([status, count]) => {
          const statusConfig = getStatusConfig(status, 'quote');
          return {
            value: status,
            label: statusConfig?.label || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
            color: statusConfig?.color,
            count
          };
        });

        // Create country options
        const countryOptions: CountryOption[] = Object.entries(countryCounts).map(([country, count]) => ({
          code: country,
          name: getCountryName(country),
          flag: getCountryFlag(country),
          count
        }));

        setAvailableStatuses(statusOptions.sort((a, b) => b.count - a.count));
        setAvailableCountries(countryOptions.sort((a, b) => b.count - a.count));
      } catch (error) {
        console.error('Error fetching filter options:', error);
        // Ensure UI remains functional with fallback data
        setAvailableStatuses([]);
        setAvailableCountries([]);
      } finally {
        setIsLoadingFilterOptions(false);
      }
    };

    // Add a small delay to prevent immediate server overwhelming
    const timeoutId = setTimeout(fetchFilterOptions, 100);
    return () => clearTimeout(timeoutId);
  }, [getStatusConfig]);

  // Helper functions for country display
  const getCountryName = (code: string): string => {
    const countryNames: Record<string, string> = {
      'IN': 'India',
      'NP': 'Nepal', 
      'US': 'United States',
      'UK': 'United Kingdom',
      'AU': 'Australia',
      'CA': 'Canada',
      'DE': 'Germany',
      'FR': 'France',
      'JP': 'Japan',
      'SG': 'Singapore'
    };
    return countryNames[code] || code;
  };

  const getCountryFlag = (code: string): string => {
    const countryFlags: Record<string, string> = {
      'IN': '🇮🇳',
      'NP': '🇳🇵',
      'US': '🇺🇸', 
      'UK': '🇬🇧',
      'AU': '🇦🇺',
      'CA': '🇨🇦',
      'DE': '🇩🇪',
      'FR': '🇫🇷',
      'JP': '🇯🇵',
      'SG': '🇸🇬'
    };
    return countryFlags[code] || '🌍';
  };

  // Search and filter handlers for new SearchAndFilterPanel
  const handleSearch = () => {
    // The search is automatically triggered by React Query when filters change
    // This handler can be used for additional analytics/logging if needed
  };

  const handleResetFilters = () => {
    setFilters({
      searchText: '',
      statuses: [],
      countries: []
    });
  };

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
    filters
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
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
  const highPriorityQuotes = quotes?.filter((q) => q.priority === 'high').length || 0;

  // Calculate quick filter counts
  const today = new Date().toISOString().split('T')[0];
  const todayQuotes = quotes?.filter((q) => q.created_at.startsWith(today)).length || 0;

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

  const totalValue = quotes?.reduce((sum, q) => sum + (q.final_total_usd || 0), 0) || 0;
  const _averageValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

  // Get selected quotes for bulk actions
  const _selectedQuotes = quotes?.filter((q) => selectedQuoteIds.includes(q.id)) || [];

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
              <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-teal-600" />
              </div>
              <div>
                <H1 className="text-gray-900">Quote Management</H1>
                <BodySmall className="text-gray-600">
                  Manage customer quotes and quote requests
                </BodySmall>
              </div>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Quote
            </Button>
          </div>
        </div>

        {/* Metrics Dashboard */}
        <QuoteMetrics quotes={quotes || []} isLoading={quotesLoading} />

        {/* Main Content Card */}
        {/* Search and Filter Panel */}
        <div className="mb-6">
          <SearchAndFilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            onSearch={handleSearch}
            onReset={handleResetFilters}
            availableStatuses={availableStatuses}
            availableCountries={availableCountries}
            isLoading={isLoadingFilterOptions || quotesLoading}
            resultsCount={quotes?.length}
            className="w-full"
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <H2 className="text-gray-900">Quotes</H2>
            </div>
          </div>

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
                  {filters.searchText ||
                  filters.statuses.length > 0 ||
                  filters.countries.length > 0
                    ? 'Try adjusting your filters to see more results.'
                    : 'Get started by creating your first quote.'}
                </Body>
                {!filters.searchText &&
                  filters.statuses.length === 0 &&
                  filters.countries.length === 0 && (
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white"
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
              {confirmAction === 'delete' &&
                'Delete Selected Quotes? This action cannot be undone.'}
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
    </div>
  );
};
