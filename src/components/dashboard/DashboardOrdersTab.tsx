
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrdersTable } from "./OrdersTable";
import { Tables } from "@/integrations/supabase/types";

type Quote = Tables<'quotes'>;

interface DashboardOrdersTabProps {
  orders: Quote[];
}

export const DashboardOrdersTab = ({ orders }: DashboardOrdersTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Orders</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track your orders and view their history
        </p>
      </CardHeader>
      <CardContent>
        <OrdersTable orders={orders || []} />
      </CardContent>
    </Card>
  );
};
