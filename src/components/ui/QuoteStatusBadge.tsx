/**
 * QuoteStatusBadge - Simple status indicator for quotes
 * Shows current quote status with appropriate colors
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type QuoteStatus = 'approved' | 'rejected' | 'calculated' | 'sent' | 'draft';

export interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  className?: string;
  showIcon?: boolean;
}

export const QuoteStatusBadge: React.FC<QuoteStatusBadgeProps> = ({
  status,
  className,
  showIcon = true
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved',
          variant: 'default' as const,
          bgColor: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="w-3 h-3" />
        };
      case 'rejected':
        return {
          label: 'Rejected', 
          variant: 'destructive' as const,
          bgColor: 'bg-red-100 text-red-800 border-red-200',
          icon: <XCircle className="w-3 h-3" />
        };
      case 'calculated':
      case 'sent':
        return {
          label: 'Pending Review',
          variant: 'secondary' as const, 
          bgColor: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Clock className="w-3 h-3" />
        };
      case 'draft':
        return {
          label: 'Draft',
          variant: 'outline' as const,
          bgColor: 'bg-gray-100 text-gray-800 border-gray-200', 
          icon: <AlertTriangle className="w-3 h-3" />
        };
      default:
        return {
          label: 'Unknown',
          variant: 'outline' as const,
          bgColor: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <AlertTriangle className="w-3 h-3" />
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1',
        config.bgColor,
        className
      )}
    >
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
};