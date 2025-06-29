import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { OrderStatusProgress } from "./OrderStatusProgress";
import { Tables } from "@/integrations/supabase/types";
import { useUserCurrency } from "@/hooks/useUserCurrency";

type Order = Tables<'quotes'>;

interface OrdersTableProps {
  orders: Order[];
}

export const OrdersTable = ({ orders }: OrdersTableProps) => {
  const navigate = useNavigate();
  const { formatAmount } = useUserCurrency();

  const handleViewOrder = (orderId: string) => {
    navigate(`/order/${orderId}`);
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">You have no orders yet.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewOrder(order.id)}>
            <TableCell>
              {order.order_display_id || order.display_id || `#${order.id.substring(0, 6)}`}
            </TableCell>
            <TableCell className="font-medium">
              {order.product_name || 'Multiple Items'}
            </TableCell>
            <TableCell>
              <OrderStatusProgress status={order.status} />
            </TableCell>
            <TableCell>
              {order.final_total ? formatAmount(order.final_total) : 'N/A'}
            </TableCell>
            <TableCell>
              {new Date(order.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                    e.stopPropagation();
                    handleViewOrder(order.id)
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
