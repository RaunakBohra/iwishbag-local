import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

const statusMap = {
  pending: { 
    label: 'Pending', 
    color: 'bg-amber-500 text-white shadow-sm rounded-full' 
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-emerald-500 text-white shadow-sm rounded-full' 
  },
  rejected: { 
    label: 'Rejected', 
    color: 'bg-red-500 text-white shadow-sm rounded-full' 
  },
  in_cart: { 
    label: 'In Cart', 
    color: 'bg-indigo-500 text-white shadow-sm rounded-full' 
  },
};

export const QuoteSummary: React.FC<QuoteSummaryProps> = ({
  status,
  total,
  itemCount,
  onApprove,
  onReject,
  isProcessing,
  renderActions,
  countryCode,
}) => {
  const statusInfo = statusMap[status] || statusMap['pending'];
  const { formatAmount } = useUserCurrency();

  const { data: countrySettings } = useQuery({
    queryKey: ['country-settings', countryCode],
    queryFn: async () => {
      if (!countryCode) return null;
      const { data, error } = await supabase
        .from('country_settings')
        .select('*')
        .eq('code', countryCode)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!countryCode,
  });

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
        className="mobile-sticky-bar bg-card border-t border-border flex md:hidden items-center justify-between px-3 py-2.5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-semibold text-foreground">{formattedTotal}</span>
          <Badge className={cn('text-xs px-1.5 py-0.5 font-medium border w-fit', statusInfo.color)}>
            {statusInfo.label}
          </Badge>
        </div>
        <div className="flex gap-1.5 items-center">
          {onApprove && (
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isProcessing}
              className="bg-foreground text-background hover:bg-foreground/90 px-3 py-1.5 h-auto text-sm"
            >
              Approve
            </Button>
          )}
          {onReject && status === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={isProcessing}
              className="border-destructive text-destructive hover:bg-destructive/10 px-3 py-1.5 h-auto text-sm"
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