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

  return null;
}; 