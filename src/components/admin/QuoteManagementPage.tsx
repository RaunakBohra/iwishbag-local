
import { AdminQuoteListItem } from "./AdminQuoteListItem";
import { CreateQuoteDialog } from "./CreateQuoteDialog";
import { RejectQuoteDialog } from "./RejectQuoteDialog";
import { QuoteFilters } from "./QuoteFilters";
import { useQuoteManagement } from "@/hooks/useQuoteManagement";
import { QuoteManagementHeader } from "./QuoteManagementHeader";
import { QuoteBulkActions } from "./QuoteBulkActions";
import { QuoteListHeader } from "./QuoteListHeader";

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

    if (quotesLoading) return <div>Loading quotes...</div>;

    return (
        <div className="space-y-6">
            <QuoteManagementHeader 
                onOpenCreateDialog={() => setCreateDialogOpen(true)}
                onDownloadCSV={downloadCSV}
            />

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

            <QuoteFilters
                searchTerm={searchInput}
                onSearchTermChange={setSearchInput}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
            />

            <QuoteBulkActions
                selectedCount={selectedQuoteIds.length}
                onBulkAction={handleBulkAction}
                isProcessing={isProcessing}
                isUpdatingStatus={isUpdatingStatus}
                activeStatusUpdate={activeStatusUpdate}
            />
            
            <QuoteListHeader
                quotes={quotes}
                selectedQuoteIds={selectedQuoteIds}
                onToggleSelectAll={handleToggleSelectAll}
            />

            <div className="grid gap-4">
                {quotes?.map((quote) => (
                    <AdminQuoteListItem
                        key={quote.id}
                        quote={quote}
                        isSelected={selectedQuoteIds.includes(quote.id)}
                        onSelect={handleToggleSelectQuote}
                    />
                ))}
            </div>
        </div>
    );
};
