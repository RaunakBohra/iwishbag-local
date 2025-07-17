import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OrderStatusProgress } from './OrderStatusProgress';
import { Tables } from '@/integrations/supabase/types';
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';

type Order = Tables<'quotes'>;

interface OrdersTableProps {
  orders: Order[];
}

const OrderRow = ({ order, onViewOrder }: { order: Order; onViewOrder: (id: string) => void }) => {
  const { formatAmount } = useQuoteDisplayCurrency({ quote: order });

  return (
    <TableRow
      key={order.id}
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onViewOrder(order.id)}
    >
      <TableCell>
        {order.order_display_id || order.display_id || `#${order.id.substring(0, 6)}`}
      </TableCell>
      <TableCell className="font-medium">{order.product_name || 'Multiple Items'}</TableCell>
      <TableCell>
        <OrderStatusProgress status={order.status} />
      </TableCell>
      <TableCell>{order.final_total ? formatAmount(order.final_total) : 'N/A'}</TableCell>
      <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
      <TableCell>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewOrder(order.id);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export const OrdersTable = ({ orders }: OrdersTableProps) => {
  const navigate = useNavigate();

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
          <OrderRow key={order.id} order={order} onViewOrder={handleViewOrder} />
        ))}
      </TableBody>
    </Table>
  );
};
