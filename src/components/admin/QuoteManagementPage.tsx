import { AdminQuoteListItem } from "./AdminQuoteListItem";
import { CreateQuoteModal } from "./CreateQuoteModal";
import { RejectQuoteDialog } from "./RejectQuoteDialog";
import { QuoteFilters } from "./QuoteFilters";
import { useQuoteManagement } from "@/hooks/useQuoteManagement";

import { QuoteListHeader } from "./QuoteListHeader";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  DollarSign,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export const QuoteManagementPage = () => {
    // Filter states managed in the page
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchInput, setSearchInput] = useState('');
    const [purchaseCountryFilter, setPurchaseCountryFilter] = useState('all');
    const [shippingCountryFilter, setShippingCountryFilter] = useState('all');
    const [dateRange, setDateRange] = useState("all");
    const [amountRange, setAmountRange] = useState("all");
    const [countryFilter, setCountryFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [confirmAction, setConfirmAction] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
        downloadCSV,
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
            <div className="space-y-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading quotes...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Calculate statistics
    const totalQuotes = quotes?.length || 0;
    const pendingQuotes = quotes?.filter(q => q.status === 'pending').length || 0;
    const approvedQuotes = quotes?.filter(q => q.status === 'approved').length || 0;
    const paidQuotes = quotes?.filter(q => q.status === 'paid').length || 0;
    const cancelledQuotes = quotes?.filter(q => q.status === 'cancelled').length || 0;
    const totalValue = quotes?.reduce((sum, q) => sum + (q.final_total || 0), 0) || 0;
    const averageValue = totalQuotes > 0 ? totalValue / totalQuotes : 0;

    // Get selected quotes for bulk actions
    const selectedQuotes = quotes?.filter(q => selectedQuoteIds.includes(q.id)) || [];

    // Clear all filters
    const clearAllFilters = () => {
        setSearchInput("");
        setStatusFilter("all");
        setDateRange("all");
        setAmountRange("all");
        setCountryFilter("all");
        setPriorityFilter("all");
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
            handleBulkAction(confirmAction as any);
        }
        setConfirmOpen(false);
        setConfirmAction(null);
    };
    const handleCancel = () => {
        setConfirmOpen(false);
        setConfirmAction(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Quote Management</h1>
                    <p className="text-muted-foreground">Manage customer quotes and quote requests</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Create New Quote
                </Button>
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

            {/* Enhanced Filters */}
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

            {/* List Header */}
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

            {/* Quotes List */}
            <div className="space-y-3">
                {quotes && quotes.length > 0 ? (
                    quotes.map((quote) => (
                        <AdminQuoteListItem
                            key={quote.id}
                            quote={quote}
                            isSelected={selectedQuoteIds.includes(quote.id)}
                            onSelect={handleToggleSelectQuote}
                        />
                    ))
                ) : (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No quotes found</h3>
                            <p className="text-muted-foreground mb-4">
                                {searchInput || statusFilter !== 'all' || dateRange !== 'all' || amountRange !== 'all' || countryFilter !== 'all' || priorityFilter !== 'all'
                                    ? "Try adjusting your filters to see more results."
                                    : "Get started by creating your first quote."}
                            </p>
                            {!searchInput && statusFilter === 'all' && dateRange === 'all' && amountRange === 'all' && countryFilter === 'all' && priorityFilter === 'all' && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                                >
                                    Create Quote
                                </button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

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
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
