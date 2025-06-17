
import { Button } from "@/components/ui/button";
import { useOrderMutations } from "@/hooks/useOrderMutations";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface OrderActionsProps {
  quote: Tables<'quotes'>;
}

export const OrderActions = ({ quote }: OrderActionsProps) => {
  const { updateOrderStatus, isUpdatingStatus } = useOrderMutations(quote.id);

  const handleStatusChange = (newStatus: string) => {
    updateOrderStatus(newStatus);
  };
  
  const renderActions = () => {
      switch (quote.status) {
          case 'cod_pending':
          case 'bank_transfer_pending':
              return (
                  <Button type="button" onClick={() => handleStatusChange('paid')} disabled={isUpdatingStatus}>
                      Confirm Payment Received
                  </Button>
              );
          case 'paid':
              return (
                  <Button type="button" onClick={() => handleStatusChange('ordered')} disabled={isUpdatingStatus}>
                      Mark as Ordered
                  </Button>
              );
          case 'ordered':
              return (
                  <p className="text-sm text-muted-foreground">Waiting for shipping information.</p>
              );
          case 'shipped':
              return (
                  <Button type="button" onClick={() => handleStatusChange('completed')} disabled={isUpdatingStatus}>
                      Mark as Completed
                  </Button>
              );
          case 'completed':
              return (
                 <p className="text-sm text-green-600 font-medium">This order is complete.</p>
              );
          case 'cancelled':
              return (
                 <p className="text-sm text-red-600 font-medium">This order has been cancelled.</p>
              );
          default:
              return null;
      }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Actions</CardTitle>
        <CardDescription>Progress this order to the next stage.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
            <p className="text-sm">Current Status: <span className="font-semibold capitalize">{quote.status}</span></p>
            {renderActions()}
        </div>
      </CardContent>
    </Card>
  );
};
