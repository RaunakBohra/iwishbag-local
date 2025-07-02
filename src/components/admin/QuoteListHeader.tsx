import { Checkbox } from "@/components/ui/checkbox";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, DollarSign, Download, Copy, Clock, AlertTriangle, Loader2, Trash2 } from "lucide-react";

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
};

interface QuoteListHeaderProps {
    quotes: QuoteWithItems[] | undefined;
    selectedQuoteIds: string[];
    onToggleSelectAll: (checked: boolean | "indeterminate") => void;
    onBulkAction: (action: 'accepted' | 'cancelled' | 'confirm_payment' | 'export' | 'priority') => void;
    isProcessing: boolean;
    isUpdatingStatus: boolean;
    activeStatusUpdate: string | null;
    onDeleteQuotes: () => void;
    isDeletingQuotes: boolean;
}

const getStatusIcon = (action: string) => {
    switch (action) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'confirm_payment':
        return <DollarSign className="h-4 w-4" />;
      case 'export':
        return <Download className="h-4 w-4" />;
      case 'priority':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
};

const getActionLabel = (action: string, isUpdatingStatus: boolean, activeStatusUpdate: string | null) => {
    switch (action) {
      case 'accepted':
        return isUpdatingStatus && activeStatusUpdate === 'accepted' ? 'Approving...' : 'Approve';
      case 'cancelled':
        return isUpdatingStatus && activeStatusUpdate === 'cancelled' ? 'Rejecting...' : 'Reject';
      case 'confirm_payment':
        return isUpdatingStatus && activeStatusUpdate === 'confirm_payment' ? 'Confirming...' : 'Confirm Payment';
      case 'export':
        return 'Export';
      case 'priority':
        return 'Change Priority';
      default:
        return action;
    }
};

const getActionVariant = (action: string) => {
    switch (action) {
      case 'accepted':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'confirm_payment':
        return 'default';
      case 'export':
        return 'outline';
      case 'priority':
        return 'outline';
      default:
        return 'outline';
    }
};

const isActionLoading = (action: string, isUpdatingStatus: boolean, activeStatusUpdate: string | null) => {
    return isUpdatingStatus && activeStatusUpdate === action;
};

const actions = [
    'accepted',
    'cancelled',
    'confirm_payment',
    'export',
    'priority',
];

export const QuoteListHeader = ({ quotes, selectedQuoteIds, onToggleSelectAll, onBulkAction, isProcessing, isUpdatingStatus, activeStatusUpdate, onDeleteQuotes, isDeletingQuotes }: QuoteListHeaderProps) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center p-4 border-b bg-muted/50 gap-2 sm:gap-0">
            <div className="flex items-center flex-1 min-w-0">
                <Checkbox
                    id="select-all"
                    checked={
                      (quotes?.length ?? 0) > 0 && selectedQuoteIds.length === quotes?.length
                        ? true
                        : selectedQuoteIds.length > 0 && selectedQuoteIds.length < (quotes?.length ?? 0)
                        ? 'indeterminate'
                        : false
                    }
                    onCheckedChange={onToggleSelectAll}
                />
                <label htmlFor="select-all" className="ml-2 text-sm font-medium truncate">
                    Select All
                </label>
            </div>
            {selectedQuoteIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                    {actions.map((action) => (
                        <Button
                            key={action}
                            variant={getActionVariant(action)}
                            size="sm"
                            onClick={() => onBulkAction(action as any)}
                            disabled={isProcessing || isActionLoading(action, isUpdatingStatus, activeStatusUpdate)}
                            className={[
                                "rounded-md px-3 py-2 font-medium text-sm transition",
                                "focus-visible:ring-2 focus-visible:ring-primary",
                                getActionVariant(action) === 'outline' ? "border border-muted bg-white hover:bg-primary/10 text-foreground" : "",
                                getActionVariant(action) === 'default' ? "bg-primary text-white hover:bg-primary/90" : "",
                                getActionVariant(action) === 'destructive' ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:text-red-900" : "",
                                "sm:px-4 sm:py-2",
                            ].join(' ')}
                        >
                            {isActionLoading(action, isUpdatingStatus, activeStatusUpdate) ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                getStatusIcon(action)
                            )}
                            {getActionLabel(action, isUpdatingStatus, activeStatusUpdate)}
                        </Button>
                    ))}
                    {/* Delete Button */}
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={onDeleteQuotes}
                        disabled={isProcessing || isDeletingQuotes}
                        className="rounded-md px-3 py-2 font-medium text-sm transition focus-visible:ring-2 focus-visible:ring-primary bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:text-red-900 sm:px-4 sm:py-2"
                    >
                        {isDeletingQuotes ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Trash2 className="h-4 w-4 mr-1" />
                        )}
                        Delete
                    </Button>
                </div>
            )}
        </div>
    );
};
