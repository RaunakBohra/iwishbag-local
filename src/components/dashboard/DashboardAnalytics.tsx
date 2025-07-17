import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Clock, ShoppingCart, Truck, DollarSign } from 'lucide-react';
import { useStatusManagement } from '@/hooks/useStatusManagement';

type Quote = Tables<'quotes'>;

interface DashboardAnalyticsProps {
  quotes: Quote[];
  orders: Quote[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const DashboardAnalytics = ({ quotes, orders }: DashboardAnalyticsProps) => {
  const {
    getStatusConfig,
    getStatusesForQuotesList: _getStatusesForQuotesList,
    getStatusesForOrdersList: _getStatusesForOrdersList,
  } = useStatusManagement();

  // Status distribution for charts - use status label for better display
  const statusCounts = quotes.reduce(
    (acc, quote) => {
      const statusConfig = getStatusConfig(quote.status, 'quote');
      const displayName = statusConfig?.label || quote.status;
      acc[displayName] = (acc[displayName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const statusData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  // DYNAMIC: Calculate quick stats using status configuration
  const pendingQuotes = quotes.filter((q) => {
    const statusConfig = getStatusConfig(q.status, 'quote');
    return statusConfig?.requiresAction || q.status === 'pending'; // fallback
  }).length;

  const itemsInCart = quotes.filter((q) => {
    const statusConfig = getStatusConfig(q.status, 'quote');
    return q.in_cart === true && (statusConfig?.allowCartActions || q.status === 'approved'); // fallback
  }).length;

  const activeOrders = orders.filter((q) => {
    const statusConfig = getStatusConfig(q.status, 'order');
    return !statusConfig?.isTerminal; // Use dynamic terminal check
  }).length;

  const cartValue = quotes
    .filter((q) => {
      const statusConfig = getStatusConfig(q.status, 'quote');
      return (
        q.in_cart && q.final_total && (statusConfig?.allowCartActions || q.status === 'approved')
      ); // fallback
    })
    .reduce((sum, q) => sum + Number(q.final_total), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingQuotes}</div>
            <p className="text-xs text-muted-foreground">Quotes awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items in Cart</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{itemsInCart}</div>
            <p className="text-xs text-muted-foreground">Approved quotes in your cart</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders}</div>
            <p className="text-xs text-muted-foreground">Orders being processed or shipped</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cart Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${cartValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Total value of items in cart</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {quotes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Quote Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This area provides a visual breakdown of your quotes. Use the charts to understand
                the status of your requests at a glance.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
