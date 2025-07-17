import { Button } from '@/components/ui/button';
import { useOrderMutations } from '@/hooks/useOrderMutations';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useState } from 'react';
import { UnifiedPaymentModal } from './UnifiedPaymentModal';
import { CheckCircle2 } from 'lucide-react';

interface OrderActionsProps {
  quote: Tables<'quotes'>;
}

export const OrderActions = ({ quote }: OrderActionsProps) => {
  const {
    updateOrderStatus,
    isUpdatingStatus,
    confirmPayment: _confirmPayment,
    isConfirmingPayment,
  } = useOrderMutations(quote.id);
  const { getStatusConfig, getAllowedTransitions } = useStatusManagement();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'record' | 'verify' | 'history' | 'refund'
  >('record');

  const handleStatusChange = (newStatus: string) => {
    updateOrderStatus(newStatus);
  };

  const handleOpenPaymentModal = (tab: 'overview' | 'record' | 'verify' | 'history' | 'refund') => {
    setActiveTab(tab);
    setShowPaymentModal(true);
  };

  const renderActions = () => {
    const currentStatusConfig = getStatusConfig(quote.status, 'order');
    const allowedTransitions = getAllowedTransitions(quote.status, 'order');

    if (!currentStatusConfig) {
      return <p className="text-sm text-muted-foreground">Unknown status: {quote.status}</p>;
    }

    if (currentStatusConfig.isTerminal) {
      return (
        <p className="text-sm text-muted-foreground">
          This order is in a terminal state: {currentStatusConfig.label}
        </p>
      );
    }

    if (allowedTransitions.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">
          No actions available for current status: {currentStatusConfig.label}
        </p>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {/* DYNAMIC: Show payment actions based on payment status and method */}
        {/* Check if payment is unpaid and show appropriate action */}
        {quote.payment_status === 'unpaid' &&
          quote.payment_method &&
          quote.payment_method !== 'bank_transfer' && (
            <Button
              type="button"
              onClick={() => handleOpenPaymentModal('record')}
              disabled={isConfirmingPayment}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm Payment
            </Button>
          )}

        {/* For unpaid bank transfers, show verification button */}
        {quote.payment_status === 'unpaid' && quote.payment_method === 'bank_transfer' && (
          <Button
            type="button"
            onClick={() => handleOpenPaymentModal('verify')}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Verify Bank Transfer
          </Button>
        )}

        {/* FALLBACK: Support legacy orders with payment_pending status */}
        {!quote.payment_status && quote.status === 'payment_pending' && (
          <Button
            type="button"
            onClick={() =>
              handleOpenPaymentModal(quote.payment_method === 'bank_transfer' ? 'verify' : 'record')
            }
            disabled={isConfirmingPayment}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {quote.payment_method === 'bank_transfer' ? 'Verify Bank Transfer' : 'Confirm Payment'}
          </Button>
        )}

        {/* Regular status transitions */}
        {allowedTransitions.map((transitionStatus) => {
          const transitionConfig = getStatusConfig(transitionStatus, 'order');
          return (
            <Button
              key={transitionStatus}
              type="button"
              onClick={() => handleStatusChange(transitionStatus)}
              disabled={isUpdatingStatus}
              variant="outline"
            >
              {transitionConfig?.label || transitionStatus}
            </Button>
          );
        })}
      </div>
    );
  };

  const currentStatusConfig = getStatusConfig(quote.status, 'order');

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Order Actions</CardTitle>
          <CardDescription>Progress this order to the next stage.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <p className="text-sm">
              Current Status:{' '}
              <span className="font-semibold">{currentStatusConfig?.label || quote.status}</span>
            </p>
            {renderActions()}
          </div>
        </CardContent>
      </Card>

      <UnifiedPaymentModal
        quote={quote}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        initialTab={activeTab}
      />
    </>
  );
};
