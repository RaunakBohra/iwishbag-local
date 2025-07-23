import { CompactQuoteListItem } from './CompactQuoteListItem';
import { CreateQuoteModal } from './CreateQuoteModal';
import { RejectQuoteDialog } from './RejectQuoteDialog';
import { UnifiedAdminToolbar, SearchFilters, CountryOption } from './UnifiedAdminToolbar';
import { useQuoteManagement } from '@/hooks/useQuoteManagement';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { useAllCountries } from '@/hooks/useAllCountries';

import { QuoteListHeader } from './QuoteListHeader';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Plus, Search, BarChart3 } from 'lucide-react';
import { H1, H2, Body, BodySmall } from '@/components/ui/typography';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: allCountries, isLoading: countriesLoading } = useAllCountries();

  // URL-based filter state management
  const filters = useMemo<SearchFilters>(() => ({
    searchText: searchParams.get('search') || '',
    countries: searchParams.get('countries') ? searchParams.get('countries')!.split(',') : []
  }), [searchParams]);

  const updateFilters = (newFilters: SearchFilters) => {
    const params = new URLSearchParams(searchParams);
    
    // Update search parameter
    if (newFilters.searchText) {
      params.set('search', newFilters.searchText);
    } else {
      params.delete('search');
    }
    
    // Update countries parameter
    if (newFilters.countries.length > 0) {
      params.set('countries', newFilters.countries.join(','));
    } else {
      params.delete('countries');
    }
    
    setSearchParams(params, { replace: true });
  };
  
  // UI state
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Search and filter handlers for new SearchAndFilterPanel
  const handleSearch = () => {
    // The search is automatically triggered by React Query when filters change
    // This handler can be used for additional analytics/logging if needed
  };

  const handleResetFilters = () => {
    updateFilters({
      searchText: '',
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


  // Calculate country counts from quotes
  const availableCountries: CountryOption[] = useMemo(() => {
    if (!allCountries || !quotes) return [];
    
    // Count quotes per destination country
    const countryCounts = quotes.reduce((acc, quote) => {
      const country = quote.destination_country;
      if (country) {
        acc[country] = (acc[country] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Map countries from database with counts
    return allCountries
      .filter(country => countryCounts[country.code] > 0) // Only show countries with quotes
      .map(country => ({
        code: country.code,
        name: country.name,
        count: countryCounts[country.code] || 0
      }))
      .sort((a, b) => (b.count || 0) - (a.count || 0)); // Sort by count descending
  }, [allCountries, quotes]);

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
          <UnifiedAdminToolbar
            quotes={[]}
            filters={filters}
            onFiltersChange={updateFilters}
            onSearch={handleSearch}
            onReset={handleResetFilters}
            onCreateQuote={() => setIsCreateModalOpen(true)}
            availableCountries={availableCountries}
            isLoading={true}
          />
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <Body className="text-gray-600">Loading quotes and admin permissions...</Body>
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
                {/* Breadcrumb Navigation */}
                <Breadcrumb className="mb-2">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Quotes</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                
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

        {/* Unified Admin Toolbar - Analytics + Search + Filters in One Line */}
        <UnifiedAdminToolbar
          quotes={quotes || []}
          filters={filters}
          onFiltersChange={updateFilters}
          onSearch={handleSearch}
          onReset={handleResetFilters}
          onCreateQuote={() => setIsCreateModalOpen(true)}
          availableCountries={availableCountries}
          isLoading={quotesLoading}
        />

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
                  filters.countries.length > 0
                    ? 'Try adjusting your filters to see more results.'
                    : 'Get started by creating your first quote.'}
                </Body>
                {!filters.searchText &&
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
