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
    label: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
    color: 'bg-gray-100 text-gray-800'
  };

  const formattedTotal = formatAmount(total);

  return (
    <>
      {/* Sticky top summary for desktop */}
      <motion.div
        className={cn(
          'hidden md:flex sticky top-4 z-30 bg-card border border-border rounded-lg items-center justify-between px-6 py-4 mb-6',
          'transition-all duration-300'
        )}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <Badge className={cn('text-sm px-3 py-1 font-medium border', statusInfo.color)}>
            {statusInfo.label}
          </Badge>
          <span className="text-lg font-semibold text-foreground">{formattedTotal}</span>
          <span className="text-muted-foreground">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
        </div>
        <div className="flex gap-2 items-center">
          {onApprove && (
            <Button
              onClick={onApprove}
              disabled={isProcessing}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Approve & Add to Cart
            </Button>
          )}
          {onReject && status === 'pending' && (
            <Button
              variant="outline"
              onClick={onReject}
              disabled={isProcessing}
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              Reject Quote
            </Button>
          )}
          {renderActions && renderActions()}
        </div>
      </motion.div>

      {/* Sticky bottom action bar for mobile */}
      <motion.div
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4',
          'transition-all duration-300'
        )}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs px-2 py-1', statusInfo.color)}>
              {statusInfo.label}
            </Badge>
            <span className="text-sm font-medium">{formattedTotal}</span>
          </div>
          <span className="text-xs text-muted-foreground">{itemCount} items</span>
        </div>
        <div className="flex gap-2">
          {onApprove && (
            <Button
              onClick={onApprove}
              disabled={isProcessing}
              className="flex-1 bg-foreground text-background hover:bg-foreground/90"
              size="sm"
            >
              Approve & Add to Cart
            </Button>
          )}
          {onReject && status === 'pending' && (
            <Button
              variant="outline"
              onClick={onReject}
              disabled={isProcessing}
              className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
              size="sm"
            >
              Reject
            </Button>
          )}
          {renderActions && renderActions()}
        </div>
      </motion.div>
    </>
  );
}; 