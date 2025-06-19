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
  pending: { label: 'Pending', color: 'bg-yellow-100/50 text-yellow-800 border-yellow-200/50' },
  approved: { label: 'Approved', color: 'bg-green-100/50 text-green-800 border-green-200/50' },
  rejected: { label: 'Rejected', color: 'bg-red-100/50 text-red-800 border-red-200/50' },
  in_cart: { label: 'In Cart', color: 'bg-blue-100/50 text-blue-800 border-blue-200/50' },
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
          'hidden md:flex sticky top-4 z-30 backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl shadow-2xl items-center justify-between px-6 py-4 mb-6',
          'transition-all duration-300'
        )}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <Badge className={cn('text-base px-3 py-1 font-semibold backdrop-blur-xl border', statusInfo.color)}>
            {statusInfo.label}
          </Badge>
          <span className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{formattedTotal}</span>
          <span className="text-muted-foreground">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
        </div>
        <div className="flex gap-2 items-center">
          {onApprove && (
            <Button
              onClick={onApprove}
              disabled={isProcessing}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Approve & Add to Cart
            </Button>
          )}
          {onReject && status === 'pending' && (
            <Button
              variant="outline"
              onClick={onReject}
              disabled={isProcessing}
              className="border-destructive text-destructive hover:bg-destructive/10 backdrop-blur-xl"
            >
              Reject Quote
            </Button>
          )}
          {renderActions && renderActions()}
        </div>
      </motion.div>

      {/* Sticky bottom action bar for mobile */}
      <motion.div
        className="mobile-sticky-bar backdrop-blur-xl bg-white/20 border-t border-white/30 flex md:hidden items-center justify-between px-4 py-3 shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{formattedTotal}</span>
          <Badge className={cn('text-xs px-2 py-0.5 font-semibold backdrop-blur-xl border', statusInfo.color)}>
            {statusInfo.label}
          </Badge>
        </div>
        <div className="flex gap-2 items-center">
          {onApprove && (
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isProcessing}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all duration-300"
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
              className="border-destructive text-destructive hover:bg-destructive/10 backdrop-blur-xl"
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