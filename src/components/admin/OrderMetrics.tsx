import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Receipt,
  CreditCard,
  Truck
} from 'lucide-react';
import { BodySmall } from '@/components/ui/typography';

type OrderWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  profiles?: { preferred_display_currency?: string } | null;
};

interface OrderMetricsProps {
  orders: OrderWithItems[];
  isLoading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  iconColor: string;
  description?: string;
  actionable?: boolean;
  onClick?: () => void;
}

const MetricCard = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon, 
  iconColor, 
  description, 
  actionable,
  onClick 
}: MetricCardProps) => (
  <Card className={`border-gray-200 hover:border-gray-300 transition-colors ${actionable ? 'cursor-pointer hover:shadow-md' : ''}`} onClick={onClick}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg ${iconColor} flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <BodySmall className="text-gray-600 font-medium">{title}</BodySmall>
              {description && (
                <BodySmall className="text-gray-500 text-xs">{description}</BodySmall>
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-semibold text-gray-900">{value}</div>
            {change && (
              <div className="flex items-center gap-1">
                {changeType === 'positive' && <TrendingUp className="h-3 w-3 text-green-600" />}
                {changeType === 'negative' && <TrendingDown className="h-3 w-3 text-red-600" />}
                <BodySmall className={`font-medium ${
                  changeType === 'positive' ? 'text-green-600' : 
                  changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {change}
                </BodySmall>
              </div>
            )}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
};

const getChangePercentage = (current: number, previous: number): { change: string; type: 'positive' | 'negative' | 'neutral' } => {
  if (previous === 0) return { change: 'N/A', type: 'neutral' };
  
  const percentage = ((current - previous) / previous) * 100;
  const sign = percentage > 0 ? '+' : '';
  
  return {
    change: `${sign}${percentage.toFixed(1)}%`,
    type: percentage > 0 ? 'positive' : percentage < 0 ? 'negative' : 'neutral'
  };
};

export const OrderMetrics = ({ orders, isLoading }: OrderMetricsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="border-gray-200">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1" />
                    <div className="h-2 bg-gray-200 rounded w-20" />
                  </div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + (order.final_total || 0), 0);
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  
  // Status counts
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const paidOrders = orders.filter(o => ['paid', 'ordered', 'shipped', 'completed'].includes(o.status)).length;
  const shippedOrders = orders.filter(o => ['shipped', 'completed'].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  
  // Payment status counts
  const unpaidOrders = orders.filter(o => o.payment_status === 'unpaid').length;
  const partialPayments = orders.filter(o => o.payment_status === 'partial').length;
  const paidPayments = orders.filter(o => o.payment_status === 'paid').length;
  
  // Outstanding amount
  const outstandingAmount = orders.reduce((sum, order) => {
    const remaining = (order.final_total || 0) - (order.amount_paid || 0);
    return sum + Math.max(remaining, 0);
  }, 0);
  
  // Mock previous period data for percentage changes
  const previousPeriod = {
    totalOrders: Math.floor(totalOrders * 0.85),
    totalRevenue: totalRevenue * 0.90,
    averageOrderValue: averageOrderValue * 0.95,
    unpaidOrders: unpaidOrders * 1.2,
    shippedOrders: shippedOrders * 0.8,
    completedOrders: completedOrders * 0.85,
  };
  
  const revenueChange = getChangePercentage(totalRevenue, previousPeriod.totalRevenue);
  const ordersChange = getChangePercentage(totalOrders, previousPeriod.totalOrders);
  const avgOrderChange = getChangePercentage(averageOrderValue, previousPeriod.averageOrderValue);
  const unpaidChange = getChangePercentage(unpaidOrders, previousPeriod.unpaidOrders);
  const shippedChange = getChangePercentage(shippedOrders, previousPeriod.shippedOrders);
  const completedChange = getChangePercentage(completedOrders, previousPeriod.completedOrders);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(totalRevenue)}
        change={revenueChange.change}
        changeType={revenueChange.type}
        icon={<DollarSign className="h-5 w-5 text-green-600" />}
        iconColor="bg-green-50"
        description="This month"
      />
      
      <MetricCard
        title="Total Orders"
        value={totalOrders.toString()}
        change={ordersChange.change}
        changeType={ordersChange.type}
        icon={<Package className="h-5 w-5 text-blue-600" />}
        iconColor="bg-blue-50"
        description="All time"
      />
      
      <MetricCard
        title="Average Order"
        value={formatCurrency(averageOrderValue)}
        change={avgOrderChange.change}
        changeType={avgOrderChange.type}
        icon={<TrendingUp className="h-5 w-5 text-indigo-600" />}
        iconColor="bg-indigo-50"
        description="Per order"
      />
      
      <MetricCard
        title="Unpaid Orders"
        value={unpaidOrders.toString()}
        change={unpaidChange.change}
        changeType={unpaidChange.type === 'positive' ? 'negative' : 'positive'} // Reverse for unpaid
        icon={<AlertCircle className="h-5 w-5 text-red-600" />}
        iconColor="bg-red-50"
        description="Needs attention"
        actionable={unpaidOrders > 0}
      />
      
      <MetricCard
        title="Shipped Orders"
        value={shippedOrders.toString()}
        change={shippedChange.change}
        changeType={shippedChange.type}
        icon={<Truck className="h-5 w-5 text-purple-600" />}
        iconColor="bg-purple-50"
        description="In transit"
      />
      
      <MetricCard
        title="Completed"
        value={completedOrders.toString()}
        change={completedChange.change}
        changeType={completedChange.type}
        icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
        iconColor="bg-emerald-50"
        description="Delivered"
      />
    </div>
  );
};