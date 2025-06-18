import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { formatAmountForDisplay } from '@/lib/currencyUtils';
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
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  in_cart: { label: 'In Cart', color: 'bg-blue-100 text-blue-800' },
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

  const formattedTotal = formatAmountForDisplay(total, countrySettings?.currency || 'USD');

  return (
    <>
      {/* Sticky top summary for desktop */}
      <motion.div
        className={cn(
          'hidden md:flex sticky top-4 z-30 bg-white rounded-xl shadow-md items-center justify-between px-6 py-4 mb-6 border',
          'transition-all duration-300'
        )}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <Badge className={cn('text-base px-3 py-1 font-semibold', statusInfo.color)}>
            {statusInfo.label}
          </Badge>
          <span className="text-xl font-bold">{formattedTotal}</span>
          <span className="text-gray-500">{itemCount} {itemCount === 1 ? 'Item' : 'Items'}</span>
        </div>
        <div className="flex gap-2 items-center">
          {onApprove && (
            <Button
              onClick={onApprove}
              disabled={isProcessing}
              className="bg-primary text-white"
            >
              Approve & Add to Cart
            </Button>
          )}
          {onReject && (
            <Button
              variant="outline"
              onClick={onReject}
              disabled={isProcessing}
              className="border-destructive text-destructive"
            >
              Reject Quote
            </Button>
          )}
          {renderActions && renderActions()}
        </div>
      </motion.div>

      {/* Sticky bottom action bar for mobile */}
      <motion.div
        className="fixed bottom-0 left-0 w-full z-40 bg-white border-t flex md:hidden items-center justify-between px-4 py-3 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold">{formattedTotal}</span>
          <Badge className={cn('text-xs px-2 py-0.5 font-semibold', statusInfo.color)}>
            {statusInfo.label}
          </Badge>
        </div>
        <div className="flex gap-2 items-center">
          {onApprove && (
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isProcessing}
              className="bg-primary text-white"
            >
              Approve
            </Button>
          )}
          {onReject && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={isProcessing}
              className="border-destructive text-destructive"
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