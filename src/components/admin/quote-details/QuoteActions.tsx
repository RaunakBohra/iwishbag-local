import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AdminQuoteDetails } from '@/hooks/admin/useAdminQuoteDetails';
import {
  Send,
  CheckCircle,
  XCircle,
  DollarSign,
  Package,
  Truck,
  Archive
} from 'lucide-react';

interface QuoteActionsProps {
  quote: AdminQuoteDetails;
  onUpdate: (updates: Partial<AdminQuoteDetails>) => Promise<void>;
  isUpdating: boolean;
}

export const QuoteActions: React.FC<QuoteActionsProps> = ({
  quote,
  onUpdate,
  isUpdating
}) => {
  const handleStatusChange = async (newStatus: string) => {
    await onUpdate({ status: newStatus });
  };

  // Get available actions based on current status
  const getAvailableActions = () => {
    switch (quote.status) {
      case 'pending':
        return [
          { label: 'Send Quote', status: 'sent', icon: Send, variant: 'default' as const },
          { label: 'Reject', status: 'rejected', icon: XCircle, variant: 'destructive' as const }
        ];
      case 'sent':
        return [
          { label: 'Mark Approved', status: 'approved', icon: CheckCircle, variant: 'default' as const },
          { label: 'Reject', status: 'rejected', icon: XCircle, variant: 'destructive' as const }
        ];
      case 'approved':
        return [
          { label: 'Mark Paid', status: 'paid', icon: DollarSign, variant: 'default' as const }
        ];
      case 'paid':
        return [
          { label: 'Mark Ordered', status: 'ordered', icon: Package, variant: 'default' as const }
        ];
      case 'ordered':
        return [
          { label: 'Mark Shipped', status: 'shipped', icon: Truck, variant: 'default' as const }
        ];
      case 'shipped':
        return [
          { label: 'Mark Completed', status: 'completed', icon: CheckCircle, variant: 'default' as const }
        ];
      default:
        return [];
    }
  };

  const actions = getAvailableActions();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.status}
              onClick={() => handleStatusChange(action.status)}
              disabled={isUpdating}
              variant={action.variant}
              className="w-full justify-start"
            >
              <Icon className="w-4 h-4 mr-2" />
              {action.label}
            </Button>
          );
        })}
        
        {quote.status === 'rejected' && (
          <Button
            onClick={() => handleStatusChange('pending')}
            disabled={isUpdating}
            variant="outline"
            className="w-full justify-start"
          >
            <Archive className="w-4 h-4 mr-2" />
            Reopen Quote
          </Button>
        )}
      </CardContent>
    </Card>
  );
};