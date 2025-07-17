import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useUserCurrency } from '@/hooks/useUserCurrency';
// Removed unused useQuery and supabase imports
import { useStatusManagement } from '@/hooks/useStatusManagement';

interface QuoteSummaryProps {
  status: string; // DYNAMIC: Allow any status instead of hardcoded union
  total: number;
  itemCount: number;
  onApprove?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
  renderActions?: () => React.ReactNode;
  countryCode?: string;
}

export const QuoteSummary: React.FC<QuoteSummaryProps> = ({
  status,
  total,
  itemCount,
  onApprove,
  onReject,
  isProcessing = false,
  renderActions,
  _countryCode,
}) => {
  const { formatAmount } = useUserCurrency();
  const { getStatusConfig } = useStatusManagement();

  // DYNAMIC: Get status configuration from the management system
  const statusConfig = getStatusConfig(status, 'quote');

  // Fallback status info if not found in management system
  const statusInfo = statusConfig
    ? {
        label: statusConfig.label,
        color: statusConfig.badgeVariant || 'secondary',
      }
    : {
        label: status
          ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')
          : 'Unknown',
        color: 'secondary',
      };

  const formattedTotal = formatAmount(total);

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Quote Status and Total */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="secondary" className={cn('text-xs font-medium', statusInfo.color)}>
              {statusInfo.label}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Quote Total</p>
            <p className="text-2xl font-bold text-foreground">{formattedTotal}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* DYNAMIC: Approve Button */}
          {onApprove && statusConfig?.allowApproval && (
            <Button
              onClick={onApprove}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Approving...
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center"
                  >
                    ✓ Approve Quote
                  </motion.div>
                </>
              )}
            </Button>
          )}

          {/* DYNAMIC: Reject Button */}
          {onReject && statusConfig?.allowRejection && (
            <Button onClick={onReject} disabled={isProcessing} variant="destructive">
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Rejecting...
                </>
              ) : (
                'Reject Quote'
              )}
            </Button>
          )}

          {/* Custom Actions */}
          {renderActions && renderActions()}
        </div>
      </div>

      {/* DYNAMIC: Status-specific messages */}
      {statusConfig?.customerMessage && (
        <div
          className={`mt-4 p-3 rounded-lg ${
            statusConfig.isSuccessful
              ? 'bg-green-50 border border-green-200'
              : statusConfig.isTerminal
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <p
            className={`text-sm ${
              statusConfig.isSuccessful
                ? 'text-green-800'
                : statusConfig.isTerminal
                  ? 'text-red-800'
                  : 'text-blue-800'
            }`}
          >
            {statusConfig.customerMessage}
          </p>
        </div>
      )}
    </div>
  );
};
