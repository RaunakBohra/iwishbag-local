import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  XCircle,
  DollarSign,
  Mail,
  Download,
  Copy,
  Clock,
  Users,
  Package,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { Tables } from '@/integrations/supabase/types';

type Quote = Tables<'quotes'>;

interface QuoteBulkActionsProps {
  selectedCount: number;
  selectedQuotes?: Quote[]; // Add selected quotes for summary
  onBulkAction: (
    action:
      | 'approved'
      | 'cancelled'
      | 'confirm_payment'
      | 'email'
      | 'export'
      | 'duplicate'
      | 'priority',
  ) => void;
  isProcessing: boolean;
  isUpdatingStatus: boolean;
  activeStatusUpdate: string | null;
}

export const QuoteBulkActions = ({
  selectedCount,
  selectedQuotes = [],
  onBulkAction,
  isProcessing,
  isUpdatingStatus,
  activeStatusUpdate,
}: QuoteBulkActionsProps) => {
  const [showSummary, setShowSummary] = useState(false);

  if (selectedCount === 0) {
    return null;
  }

  // Calculate summary statistics
  const totalValue = selectedQuotes.reduce((sum, quote) => sum + (quote.final_total || 0), 0);
  const statusBreakdown = selectedQuotes.reduce(
    (acc, quote) => {
      acc[quote.status] = (acc[quote.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const priorityBreakdown = selectedQuotes.reduce(
    (acc, quote) => {
      const priority = quote.priority || 'none';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const getStatusIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'confirm_payment':
        return <DollarSign className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'export':
        return <Download className="h-4 w-4" />;
      case 'duplicate':
        return <Copy className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'approved':
        return isUpdatingStatus && activeStatusUpdate === 'approved'
          ? 'Approving...'
          : 'Approve Selected';
      case 'cancelled':
        return isUpdatingStatus && activeStatusUpdate === 'cancelled'
          ? 'Rejecting...'
          : 'Reject Selected';
      case 'confirm_payment':
        return isUpdatingStatus && activeStatusUpdate === 'confirm_payment'
          ? 'Confirming...'
          : 'Confirm Payment';
      case 'email':
        return 'Send Email';
      case 'export':
        return 'Export CSV';
      case 'duplicate':
        return 'Duplicate';
      case 'priority':
        return 'Set Priority';
      default:
        return action;
    }
  };

  const getActionVariant = (action: string) => {
    switch (action) {
      case 'approved':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'confirm_payment':
        return 'secondary';
      case 'email':
        return 'outline';
      case 'export':
        return 'outline';
      case 'duplicate':
        return 'outline';
      case 'priority':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const isActionLoading = (action: string) => {
    return isUpdatingStatus && activeStatusUpdate === action;
  };

  const actionButtons = [
    'approved',
    'cancelled',
    'confirm_payment',
    'email',
    'export',
    'duplicate',
    'priority',
  ];

  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">{selectedCount} quotes selected</span>
            </div>

            {totalValue > 0 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  Total: ${totalValue.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)}>
            {showSummary ? 'Hide' : 'Show'} Summary
          </Button>
        </div>

        {/* Summary Section */}
        {showSummary && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Breakdown */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  Status Breakdown
                </h4>
                <div className="space-y-1">
                  {Object.entries(statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex justify-between text-xs">
                      <span className="capitalize">{status}:</span>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority Breakdown */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Priority Breakdown
                </h4>
                <div className="space-y-1">
                  {Object.entries(priorityBreakdown).map(([priority, count]) => (
                    <div key={priority} className="flex justify-between text-xs">
                      <span className="capitalize">{priority}:</span>
                      <Badge variant="outline" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div>
                <h4 className="text-sm font-medium mb-2">Quick Stats</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>
                    Average Value: ${totalValue > 0 ? (totalValue / selectedCount).toFixed(2) : '0'}
                  </div>
                  <div>
                    Countries: {new Set(selectedQuotes.map((q) => q.destination_country)).size}
                  </div>
                  <div>Customers: {new Set(selectedQuotes.map((q) => q.email)).size}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Primary Actions */}
          {actionButtons.map((action) => (
            <Button
              key={action}
              variant={getActionVariant(action)}
              size="sm"
              onClick={() =>
                onBulkAction(
                  action as
                    | 'approved'
                    | 'cancelled'
                    | 'confirm_payment'
                    | 'email'
                    | 'export'
                    | 'duplicate'
                    | 'priority',
                )
              }
              disabled={isProcessing || isActionLoading(action)}
              className={[
                // Common polish for all buttons
                'rounded-md px-3 py-2 font-medium text-sm transition',
                'focus-visible:ring-2 focus-visible:ring-primary',
                // Outline/ghost/secondary
                getActionVariant(action) === 'outline'
                  ? 'border border-muted bg-white hover:bg-primary/10 text-foreground'
                  : '',
                // Primary
                getActionVariant(action) === 'default'
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : '',
                // Destructive
                getActionVariant(action) === 'destructive'
                  ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:text-red-900'
                  : '',
                // Compact on mobile
                'sm:px-4 sm:py-2',
              ].join(' ')}
            >
              {isActionLoading(action) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                getStatusIcon(action)
              )}
              {getActionLabel(action)}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
