import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStatusManagement } from '@/hooks/useStatusManagement';

interface QuoteSummaryProps {
  status: 'pending' | 'approved' | 'rejected' | 'in_cart';
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
  countryCode
}) => {
  const { formatAmount } = useUserCurrency();
  const { quoteStatuses } = useStatusManagement();

  // Get status configuration from the management system
  const statusConfig = (quoteStatuses || []).find(s => s.name === status);

  // Fallback status info if not found in management system
  const statusInfo = statusConfig ? {
    label: statusConfig.label,
    color: statusConfig.color || 'bg-gray-100 text-gray-800'
  } : {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ') : 'Unknown',
    color: 'bg-gray-100 text-gray-800'
  };

  const formattedTotal = formatAmount(total);

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Quote Status and Total */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Badge 
              variant="secondary" 
              className={cn("text-xs font-medium", statusInfo.color)}
            >
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
          {/* Approve Button */}
          {onApprove && status === 'pending' && (
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

          {/* Reject Button */}
          {onReject && status === 'pending' && (
            <Button
              onClick={onReject}
              disabled={isProcessing}
              variant="destructive"
            >
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
      
      {/* Status-specific messages */}
      {status === 'approved' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✓ Quote approved! You can now add this to your cart.
          </p>
        </div>
      )}
      
      {status === 'rejected' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            ✗ This quote has been rejected.
          </p>
        </div>
      )}
    </div>
  );
}; 