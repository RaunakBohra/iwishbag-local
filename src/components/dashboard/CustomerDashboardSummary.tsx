import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { ShoppingCart, Package, Clock, CheckCircle } from 'lucide-react';

type Quote = Tables<'quotes'>;

interface CustomerDashboardSummaryProps {
  quotes: Quote[];
  orders: Quote[];
}

export const CustomerDashboardSummary = ({ quotes, orders }: CustomerDashboardSummaryProps) => {
  const totalQuotes = quotes.length;
  const pendingQuotes = quotes.filter((q) =>
    ['pending', 'calculated', 'sent'].includes(q.status),
  ).length;
  const totalOrders = orders.length;
  const itemsInCart = quotes.filter((q) => q.in_cart).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Quotes</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalQuotes}</div>
          <p className="text-xs text-muted-foreground">All your quote requests</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingQuotes}</div>
          <p className="text-xs text-muted-foreground">Awaiting response</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cart Items</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{itemsInCart}</div>
          <p className="text-xs text-muted-foreground">Ready to checkout</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Orders</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalOrders}</div>
          <p className="text-xs text-muted-foreground">Completed purchases</p>
        </CardContent>
      </Card>
    </div>
  );
};
