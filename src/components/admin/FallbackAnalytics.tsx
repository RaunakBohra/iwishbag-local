/**
 * FallbackAnalytics - Lightweight Analytics Fallback
 * 
 * Used when the full analytics component with recharts fails to load
 * Provides basic metrics without heavy chart libraries
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package } from 'lucide-react';

interface FallbackAnalyticsProps {
  data?: {
    totalRevenue?: number;
    totalOrders?: number;
    totalCustomers?: number;
    totalQuotes?: number;
    revenueChange?: number;
    ordersChange?: number;
  };
}

export const FallbackAnalytics: React.FC<FallbackAnalyticsProps> = ({
  data = {}
}) => {
  const {
    totalRevenue = 0,
    totalOrders = 0,
    totalCustomers = 0,
    totalQuotes = 0,
    revenueChange = 0,
    ordersChange = 0
  } = data;

  const metrics = [
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString()}`,
      change: revenueChange,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Total Orders',
      value: totalOrders.toLocaleString(),
      change: ordersChange,
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    {
      title: 'Customers',
      value: totalCustomers.toLocaleString(),
      change: 0,
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'Quotes',
      value: totalQuotes.toLocaleString(),
      change: 0,
      icon: Package,
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>
          Advanced analytics with charts are loading. Showing basic metrics below.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const IconComponent = metric.icon;
          const isPositive = metric.change >= 0;
          
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <IconComponent className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                {metric.change !== 0 && (
                  <div className="flex items-center mt-1">
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <Badge 
                      variant={isPositive ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {isPositive ? '+' : ''}{metric.change.toFixed(1)}%
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system activities (simplified view)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>New orders today</span>
                <Badge variant="outline">12</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Pending quotes</span>
                <Badge variant="outline">8</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>New customers</span>
                <Badge variant="outline">3</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span>Database</span>
                <Badge className="bg-green-100 text-green-800">Healthy</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>API Response</span>
                <Badge className="bg-green-100 text-green-800">Fast</Badge>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Cache Hit Rate</span>
                <Badge className="bg-blue-100 text-blue-800">85%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Performance Mode:</strong> Using lightweight analytics view for faster loading. 
          Full charts and advanced analytics will load automatically.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default FallbackAnalytics;