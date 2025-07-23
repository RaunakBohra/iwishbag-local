import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  TrendingUp,
  Star,
  UserCheck,
  DollarSign,
  ShoppingCart,
  Calendar,
  Activity,
} from 'lucide-react';
import { H2, Body, BodySmall } from '@/components/ui/typography';
import { CustomerAnalytics, Customer } from '@/types/customer';

interface CustomerMetricsProps {
  customers: Customer[];
  customerAnalytics?: CustomerAnalytics[];
  isLoading: boolean;
}

export const CustomerMetrics = ({
  customers,
  customerAnalytics,
  isLoading,
}: CustomerMetricsProps) => {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate metrics
  const totalCustomers = customers?.length || 0;
  const activeCustomers = customers?.filter((c) => c.cod_enabled)?.length || 0;
  const vipCustomers = customers?.filter((c) => c.internal_notes?.includes('VIP'))?.length || 0;

  // Calculate time-based metrics
  const now = new Date();
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const newThisMonth = customers?.filter((c) => new Date(c.created_at) >= monthAgo)?.length || 0;
  const newThisWeek = customers?.filter((c) => new Date(c.created_at) >= weekAgo)?.length || 0;

  // Calculate revenue and order metrics from analytics
  const totalRevenue =
    customerAnalytics?.reduce((sum, analytics) => sum + analytics.totalSpent, 0) || 0;
  const totalOrders =
    customerAnalytics?.reduce((sum, analytics) => sum + analytics.orderCount, 0) || 0;
  const totalQuotes =
    customerAnalytics?.reduce((sum, analytics) => sum + analytics.quoteCount, 0) || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Calculate recent activity
  const recentlyActive =
    customerAnalytics?.filter((analytics) => {
      const lastActivity = new Date(analytics.lastActivity);
      return lastActivity >= weekAgo;
    })?.length || 0;

  const metrics = [
    {
      title: 'Total Customers',
      value: formatNumber(totalCustomers),
      trend: newThisMonth > 0 ? `+${newThisMonth} this month` : 'No change',
      icon: Users,
      color: 'blue',
      trendUp: newThisMonth > 0,
    },
    {
      title: 'Active Customers',
      value: formatNumber(activeCustomers),
      trend:
        totalCustomers > 0
          ? `${((activeCustomers / totalCustomers) * 100).toFixed(1)}% of total`
          : '0%',
      icon: UserCheck,
      color: 'green',
      trendUp: activeCustomers > 0,
    },
    {
      title: 'VIP Customers',
      value: formatNumber(vipCustomers),
      trend:
        totalCustomers > 0
          ? `${((vipCustomers / totalCustomers) * 100).toFixed(1)}% of total`
          : '0%',
      icon: Star,
      color: 'yellow',
      trendUp: vipCustomers > 0,
    },
    {
      title: 'New This Week',
      value: formatNumber(newThisWeek),
      trend: newThisMonth > newThisWeek ? `${newThisMonth} this month` : 'Same as month',
      icon: TrendingUp,
      color: 'purple',
      trendUp: newThisWeek > 0,
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      trend:
        totalCustomers > 0 ? `${formatCurrency(totalRevenue / totalCustomers)} per customer` : '$0',
      icon: DollarSign,
      color: 'emerald',
      trendUp: totalRevenue > 0,
    },
    {
      title: 'Total Orders',
      value: formatNumber(totalOrders),
      trend: totalCustomers > 0 ? `${(totalOrders / totalCustomers).toFixed(1)} per customer` : '0',
      icon: ShoppingCart,
      color: 'indigo',
      trendUp: totalOrders > 0,
    },
    {
      title: 'Avg Order Value',
      value: formatCurrency(avgOrderValue),
      trend: totalQuotes > 0 ? `${totalQuotes} total quotes` : 'No quotes',
      icon: DollarSign,
      color: 'orange',
      trendUp: avgOrderValue > 0,
    },
    {
      title: 'Recently Active',
      value: formatNumber(recentlyActive),
      trend:
        totalCustomers > 0
          ? `${((recentlyActive / totalCustomers) * 100).toFixed(1)}% of total`
          : '0%',
      icon: Activity,
      color: 'pink',
      trendUp: recentlyActive > 0,
    },
  ];

  return (
    <div className="mb-8">
      <div className="mb-6">
        <H2 className="text-gray-900 mb-2">Customer Overview</H2>
        <BodySmall className="text-gray-600">
          Key metrics and insights about your customer base
        </BodySmall>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card
              key={index}
              className="border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {metric.title}
                  </CardTitle>
                  <div className={`h-4 w-4 text-${metric.color}-600`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline justify-between">
                  <Body className="text-2xl font-bold text-gray-900">{metric.value}</Body>
                  {metric.trendUp && (
                    <div className="flex items-center text-green-600">
                      <TrendingUp className="h-3 w-3 mr-1" />
                    </div>
                  )}
                </div>
                <BodySmall className="text-gray-600 mt-1">{metric.trend}</BodySmall>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
