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

export const QuoteManagementPage = () => {
    const {
        statusFilter,
        setStatusFilter,
        searchInput,
        setSearchInput,
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
    } = useQuoteManagement();

    // New filter states
    const [dateRange, setDateRange] = useState("all");
    const [amountRange, setAmountRange] = useState("all");
    const [countryFilter, setCountryFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");

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

    return (
        <div className="space-y-6">
            {/* Header */}
            <QuoteManagementHeader 
                onOpenCreateDialog={() => setCreateDialogOpen(true)}
                onDownloadCSV={downloadCSV}
            />

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Quotes</p>
                                <p className="text-2xl font-bold">{totalQuotes}</p>
                            </div>
                            <FileText className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold text-yellow-600">{pendingQuotes}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                                <p className="text-2xl font-bold text-green-600">${totalValue.toLocaleString()}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Avg. Value</p>
                                <p className="text-2xl font-bold">${averageValue.toFixed(0)}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Status Summary */}
            <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    Confirmed: {confirmedQuotes}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-green-600" />
                    Paid: {paidQuotes}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-600" />
                    Cancelled: {cancelledQuotes}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                    Pending: {pendingQuotes}
                </Badge>
            </div>

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
            />

            {/* Enhanced Bulk Actions */}
            <QuoteBulkActions
                selectedCount={selectedQuoteIds.length}
                selectedQuotes={selectedQuotes}
                onBulkAction={handleBulkAction}
                isProcessing={isProcessing}
                isUpdatingStatus={isUpdatingStatus}
                activeStatusUpdate={activeStatusUpdate}
            />
            
            {/* List Header */}
            <QuoteListHeader
                quotes={quotes}
                selectedQuoteIds={selectedQuoteIds}
                onToggleSelectAll={handleToggleSelectAll}
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
        </div>
    );
};
