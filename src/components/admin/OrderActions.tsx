import { Button } from "@/components/ui/button";
import { useOrderMutations } from "@/hooks/useOrderMutations";
import { useStatusManagement } from "@/hooks/useStatusManagement";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { PaymentConfirmationModal } from "./PaymentConfirmationModal";
import { CheckCircle2 } from "lucide-react";

interface OrderActionsProps {
  quote: Tables<'quotes'>;
}

export const OrderActions = ({ quote }: OrderActionsProps) => {
  const { updateOrderStatus, isUpdatingStatus, confirmPayment, isConfirmingPayment } = useOrderMutations(quote.id);
  const { getStatusConfig, getAllowedTransitions } = useStatusManagement();
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleStatusChange = (newStatus: string) => {
    updateOrderStatus(newStatus);
  };

  const handlePaymentConfirmation = (amount: number, notes: string) => {
    confirmPayment({ amount, notes }, {
      onSuccess: () => {
        setShowPaymentModal(false);
      }
    });
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
        {/* Special case for payment_pending - show confirm payment button */}
        {quote.status === 'payment_pending' && (
          <Button
            type="button"
            onClick={() => setShowPaymentModal(true)}
            disabled={isConfirmingPayment}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirm Payment
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
  }

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
                Current Status: <span className="font-semibold">{currentStatusConfig?.label || quote.status}</span>
              </p>
              {renderActions()}
          </div>
        </CardContent>
      </Card>

      <PaymentConfirmationModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentConfirmation}
        quote={quote}
        isConfirming={isConfirmingPayment}
      />
    </>
  );
};
