import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Users, DollarSign, Calendar, Target } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerDiscountUsage {
  id: string;
  customer_id: string;
  discount_code_id?: string;
  campaign_id?: string;
  quote_id?: string;
  order_id?: string;
  discount_amount: number;
  original_amount?: number;
  currency?: string;
  component_breakdown?: { [component: string]: number };
  components_discounted?: string[];
  used_at: string;
}

interface DiscountAnalyticsSectionProps {
  usageAnalytics: CustomerDiscountUsage[];
}

export const DiscountAnalyticsSection: React.FC<DiscountAnalyticsSectionProps> = ({
  usageAnalytics,
}) => {
  const analytics = useMemo(() => {
    if (!usageAnalytics.length) {
      return {
        totalUsage: 0,
        totalSavings: 0,
        averageDiscount: 0,
        uniqueCustomers: 0,
        topComponents: [],
        recentUsage: [],
      };
    }

    const totalSavings = usageAnalytics.reduce((sum, usage) => sum + usage.discount_amount, 0);
    const uniqueCustomers = new Set(usageAnalytics.map(u => u.customer_id)).size;
    const averageDiscount = totalSavings / usageAnalytics.length;

    // Calculate component usage
    const componentUsage: { [component: string]: { count: number; total: number } } = {};
    usageAnalytics.forEach(usage => {
      if (usage.component_breakdown) {
        Object.entries(usage.component_breakdown).forEach(([component, amount]) => {
          if (!componentUsage[component]) {
            componentUsage[component] = { count: 0, total: 0 };
          }
          componentUsage[component].count += 1;
          componentUsage[component].total += amount;
        });
      }
    });

    const topComponents = Object.entries(componentUsage)
      .map(([component, data]) => ({
        component,
        count: data.count,
        total: data.total,
        average: data.total / data.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const recentUsage = usageAnalytics
      .sort((a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime())
      .slice(0, 10);

    return {
      totalUsage: usageAnalytics.length,
      totalSavings,
      averageDiscount,
      uniqueCustomers,
      topComponents,
      recentUsage,
    };
  }, [usageAnalytics]);

  return (
    <div className="space-y-6">
      {/* Usage Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Discount applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalSavings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Customer savings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Discount</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.averageDiscount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per application
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueCustomers}</div>
            <p className="text-xs text-muted-foreground">
              Have used discounts
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Components */}
        <Card>
          <CardHeader>
            <CardTitle>Top Discounted Components</CardTitle>
            <p className="text-sm text-muted-foreground">
              Most frequently discounted order components
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topComponents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No component data available
                </p>
              ) : (
                analytics.topComponents.map((comp, index) => (
                  <div key={comp.component} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-white">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {comp.component.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {comp.count} applications
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${comp.total.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        ${comp.average.toFixed(2)} avg
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Usage</CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest discount applications
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recentUsage.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No usage data available
                </p>
              ) : (
                analytics.recentUsage.map((usage) => (
                  <div key={usage.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">
                          {usage.quote_id ? 'Quote' : 'Order'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Customer {usage.customer_id.slice(-6)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        ${usage.discount_amount.toFixed(2)} saved
                      </p>
                      {usage.original_amount && (
                        <p className="text-xs text-muted-foreground">
                          From ${usage.original_amount.toFixed(2)} original
                        </p>
                      )}
                      {usage.components_discounted && (
                        <div className="flex gap-1 mt-1">
                          {usage.components_discounted.slice(0, 3).map((component) => (
                            <Badge key={component} variant="secondary" className="text-xs">
                              {component.replace('_', ' ')}
                            </Badge>
                          ))}
                          {usage.components_discounted.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{usage.components_discounted.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(usage.used_at), 'MMM d, HH:mm')}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};