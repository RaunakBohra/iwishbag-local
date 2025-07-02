import { AdminQuoteListItem } from "./AdminQuoteListItem";
import { CreateQuoteDialog } from "./CreateQuoteDialog";
import { RejectQuoteDialog } from "./RejectQuoteDialog";
import { QuoteFilters } from "./QuoteFilters";
import { useQuoteManagement } from "@/hooks/useQuoteManagement";
import { QuoteManagementHeader } from "./QuoteManagementHeader";
import { QuoteBulkActions } from "./QuoteBulkActions";
import { QuoteListHeader } from "./QuoteListHeader";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

    const {
        quotes,
        quotesLoading,
        isCreateDialogOpen,
        setCreateDialogOpen,
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
        // ...other filters if needed
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
    const confirmedQuotes = quotes?.filter(q => q.status === 'confirmed').length || 0;
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
            <QuoteManagementHeader 
                onOpenCreateDialog={() => setCreateDialogOpen(true)}
                onDownloadCSV={downloadCSV}
            />

            {/* Dialogs */}
            <CreateQuoteDialog
                isOpen={isCreateDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onQuoteCreated={handleQuoteCreated}
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
                                    onClick={() => setCreateDialogOpen(true)}
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
                        <AlertDialogTitle>
                            {confirmAction === 'delete' && 'Delete Selected Quotes?'}
                            {confirmAction === 'accepted' && 'Approve Selected Quotes?'}
                            {confirmAction === 'cancelled' && 'Reject Selected Quotes?'}
                            {confirmAction === 'confirm_payment' && 'Confirm Payment for Selected Quotes?'}
                            {confirmAction === 'export' && 'Export Selected Quotes?'}
                            {confirmAction === 'priority' && 'Change Priority for Selected Quotes?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction === 'delete' && 'Are you sure you want to delete the selected quotes? This action cannot be undone.'}
                            {confirmAction === 'accepted' && 'Are you sure you want to approve the selected quotes?'}
                            {confirmAction === 'cancelled' && 'Are you sure you want to reject the selected quotes?'}
                            {confirmAction === 'confirm_payment' && 'Are you sure you want to confirm payment for the selected quotes?'}
                            {confirmAction === 'export' && 'Export the selected quotes?'}
                            {confirmAction === 'priority' && 'Change the priority for the selected quotes?'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirm} autoFocus>
                            {confirmAction === 'delete' && 'Delete'}
                            {confirmAction === 'accepted' && 'Approve'}
                            {confirmAction === 'cancelled' && 'Reject'}
                            {confirmAction === 'confirm_payment' && 'Confirm Payment'}
                            {confirmAction === 'export' && 'Export'}
                            {confirmAction === 'priority' && 'Change Priority'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
