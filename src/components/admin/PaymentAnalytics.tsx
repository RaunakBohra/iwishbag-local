import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  CreditCard
} from 'lucide-react';
import { PaymentAnalytics, PaymentGateway } from '@/types/payment';
import { Progress } from '@/components/ui/progress';

interface PaymentAnalyticsProps {
  timeRange?: '7d' | '30d' | '90d' | '1y';
}

export const PaymentAnalytics: React.FC<PaymentAnalyticsProps> = ({ timeRange = '30d' }) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [selectedGateway, setSelectedGateway] = useState<string>('all');

  // Calculate date range
  const getDateRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  // Fetch payment analytics
  const { data: analytics, isLoading, refetch, error } = useQuery({
    queryKey: ['payment-analytics', selectedTimeRange, selectedGateway],
    queryFn: async (): Promise<PaymentAnalytics> => {
      try {
        const startDate = getDateRange(selectedTimeRange);
        
        let query = supabase
          .from('payment_transactions')
          .select('*')
          .gte('created_at', startDate.toISOString());

        if (selectedGateway !== 'all') {
          query = query.eq('gateway_code', selectedGateway);
        }

        const { data: transactions, error } = await query;

        if (error) throw error;

        const totalTransactions = transactions?.length || 0;
        const totalAmount = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
        const completedTransactions = transactions?.filter(t => t.status === 'completed') || [];
        const failedTransactions = transactions?.filter(t => t.status === 'failed') || [];
        const pendingTransactions = transactions?.filter(t => t.status === 'pending') || [];
        
        const successRate = totalTransactions > 0 ? (completedTransactions.length / totalTransactions) * 100 : 0;
        const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

        // Calculate gateway breakdown
        const gatewayBreakdown: Record<PaymentGateway, { count: number; amount: number; success_rate: number }> = {} as any;
        
        const gateways = ['stripe', 'payu', 'esewa', 'khalti', 'fonepay', 'airwallex', 'bank_transfer', 'cod'] as PaymentGateway[];
        
        gateways.forEach(gateway => {
          const gatewayTransactions = transactions?.filter(t => t.gateway_code === gateway) || [];
          const gatewayCompleted = gatewayTransactions.filter(t => t.status === 'completed');
          const gatewayAmount = gatewayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
          
          if (gatewayTransactions.length > 0) {
            gatewayBreakdown[gateway] = {
              count: gatewayTransactions.length,
              amount: gatewayAmount,
              success_rate: (gatewayCompleted.length / gatewayTransactions.length) * 100
            };
          }
        });

        // Calculate daily trends
        const dailyData = new Map<string, { count: number; amount: number }>();
        transactions?.forEach(transaction => {
          const date = new Date(transaction.created_at).toISOString().split('T')[0];
          const existing = dailyData.get(date) || { count: 0, amount: 0 };
          dailyData.set(date, {
            count: existing.count + 1,
            amount: existing.amount + (transaction.amount || 0)
          });
        });

        // Get quotes for conversion funnel
        const { data: quotes, error: quotesError } = await supabase
          .from('quotes')
          .select('status, created_at')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

        if (quotesError) throw quotesError;

        // Calculate conversion funnel
        const cartAdded = quotes?.filter(q => q.status === 'pending').length || 0;
        const checkoutStarted = quotes?.filter(q => q.status === 'sent').length || 0;
        const paymentInitiated = quotes?.filter(q => q.status === 'approved').length || 0;
        const paymentCompleted = completedTransactions.length;

        return {
          total_transactions: totalTransactions,
          total_amount: totalAmount,
          currency: 'USD',
          success_rate: successRate,
          average_amount: averageAmount,
          gateway_breakdown: gatewayBreakdown,
          time_period: {
            start: startDate.toISOString(),
            end: new Date().toISOString()
          },
          // Additional metrics
          failed_transactions: failedTransactions.length,
          pending_transactions: pendingTransactions.length,
          daily_trends: Array.from(dailyData.entries()).map(([date, data]) => ({
            date,
            count: data.count,
            amount: data.amount
          })),
          successful_transactions: completedTransactions.length,
          total_revenue: totalAmount,
          revenue_by_gateway: gatewayBreakdown,
          conversion_funnel: {
            cart_added: cartAdded,
            checkout_started: checkoutStarted,
            payment_initiated: paymentInitiated,
            payment_completed: paymentCompleted,
          },
          recent_transactions: transactions?.slice(0, 10) || []
        };
      } catch (error) {
        console.warn('Payment transactions table not available:', error);
        // Return empty analytics when table is not available
        return {
          total_transactions: 0,
          total_amount: 0,
          currency: 'USD',
          success_rate: 0,
          average_amount: 0,
          gateway_breakdown: {} as any,
          time_period: {
            start: new Date().toISOString(),
            end: new Date().toISOString()
          },
          failed_transactions: 0,
          pending_transactions: 0,
          daily_trends: [],
          successful_transactions: 0,
          total_revenue: 0,
          revenue_by_gateway: {},
          conversion_funnel: {
            cart_added: 0,
            checkout_started: 0,
            payment_initiated: 0,
            payment_completed: 0,
          },
          recent_transactions: []
        };
      }
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const exportData = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Transactions', analytics.total_transactions],
      ['Total Amount', `$${analytics.total_amount.toFixed(2)}`],
      ['Success Rate', `${analytics.success_rate.toFixed(1)}%`],
      ['Average Amount', `$${analytics.average_amount.toFixed(2)}`],
      ['Failed Transactions', analytics.failed_transactions],
      ['Pending Transactions', analytics.pending_transactions],
      ['', ''],
      ['Gateway', 'Transactions', 'Amount', 'Success Rate'],
      ...Object.entries(analytics.gateway_breakdown).map(([gateway, stats]) => [
        gateway,
        stats.count,
        `$${stats.amount.toFixed(2)}`,
        `${stats.success_rate.toFixed(1)}%`
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-analytics-${selectedTimeRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show message if table is not available
  if (error && error.message.includes('not available')) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Payment Analytics</h2>
            <p className="text-muted-foreground">
              Payment analytics feature is not available in the current database schema.
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              This feature requires the payment_transactions table to be created in the database.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGatewayIcon = (gateway: string) => {
    switch (gateway) {
      case 'stripe': return <CreditCard className="h-4 w-4" />;
      case 'payu': return <DollarSign className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Analytics</h2>
          <p className="text-muted-foreground">
            Comprehensive payment performance and transaction insights.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <Select value={selectedGateway} onValueChange={setSelectedGateway}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Gateways</SelectItem>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="payu">PayU</SelectItem>
              <SelectItem value="esewa">eSewa</SelectItem>
              <SelectItem value="khalti">Khalti</SelectItem>
              <SelectItem value="fonepay">Fonepay</SelectItem>
              <SelectItem value="airwallex">Airwallex</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cod">Cash on Delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {analytics && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="gateways">Gateways</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.total_transactions}</div>
                  <p className="text-xs text-muted-foreground">
                    {selectedTimeRange} period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${analytics.total_amount.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.currency}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.success_rate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Payment success
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${analytics.average_amount.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Per transaction
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Transaction Status Breakdown */}
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {analytics.total_transactions - analytics.failed_transactions - analytics.pending_transactions}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Successful payments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Failed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {analytics.failed_transactions}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Failed payments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    Pending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {analytics.pending_transactions}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Pending payments
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="gateways" className="space-y-6">
            {/* Gateway Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Gateway Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.gateway_breakdown).map(([gateway, stats]) => (
                    <div key={gateway} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <BarChart3 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{gateway.replace('_', ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {stats.count} transactions
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${stats.amount.toFixed(2)}</p>
                        <Badge 
                          variant={stats.success_rate >= 90 ? "default" : stats.success_rate >= 70 ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          {stats.success_rate.toFixed(1)}% success
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            {/* Daily Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Transaction Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.daily_trends?.slice(-10).map((day) => (
                    <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {day.count} transactions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${day.amount.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          Daily total
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Cart Added</span>
              <span className="text-sm font-medium">{analytics?.conversion_funnel.cart_added}</span>
            </div>
            <Progress value={100} className="h-2" />
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Checkout Started</span>
              <span className="text-sm font-medium">{analytics?.conversion_funnel.checkout_started}</span>
            </div>
            <Progress 
              value={analytics?.conversion_funnel.cart_added > 0 ? 
                (analytics.conversion_funnel.checkout_started / analytics.conversion_funnel.cart_added) * 100 : 0
              } 
              className="h-2" 
            />
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Payment Initiated</span>
              <span className="text-sm font-medium">{analytics?.conversion_funnel.payment_initiated}</span>
            </div>
            <Progress 
              value={analytics?.conversion_funnel.checkout_started > 0 ? 
                (analytics.conversion_funnel.payment_initiated / analytics.conversion_funnel.checkout_started) * 100 : 0
              } 
              className="h-2" 
            />
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Payment Completed</span>
              <span className="text-sm font-medium">{analytics?.conversion_funnel.payment_completed}</span>
            </div>
            <Progress 
              value={analytics?.conversion_funnel.payment_initiated > 0 ? 
                (analytics.conversion_funnel.payment_completed / analytics.conversion_funnel.payment_initiated) * 100 : 0
              } 
              className="h-2" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Revenue by Gateway */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Revenue by Payment Gateway
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(analytics?.revenue_by_gateway || {}).map(([gateway, revenue]) => (
              <div key={gateway} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {getGatewayIcon(gateway)}
                  <span className="font-medium capitalize">{gateway}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">${revenue.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    {((revenue / analytics.total_amount) * 100).toFixed(1)}% of total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics?.recent_transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getGatewayIcon(transaction.gateway_code)}
                  <div>
                    <div className="font-medium capitalize">{transaction.gateway_code}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">${transaction.amount?.toFixed(2)} {transaction.currency}</div>
                  <Badge className={`text-xs ${getStatusColor(transaction.status)}`}>
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 