import { Button } from "@/components/ui/button";
import { useOrderMutations } from "@/hooks/useOrderMutations";
import { useStatusManagement } from "@/hooks/useStatusManagement";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface OrderActionsProps {
  quote: Tables<'quotes'>;
}

export const OrderActions = ({ quote }: OrderActionsProps) => {
  const { updateOrderStatus, isUpdatingStatus } = useOrderMutations(quote.id);
  const { getStatusConfig, getAllowedTransitions } = useStatusManagement();

  const handleStatusChange = (newStatus: string) => {
    updateOrderStatus(newStatus);
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
  );
};
