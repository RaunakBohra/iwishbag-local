import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw
} from 'lucide-react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

interface PaymentMetrics {
  total_transactions: number;
  successful_transactions: number;
  failed_transactions: number;
  pending_transactions: number;
  total_amount: number;
  average_amount: number;
  success_rate: number;
  failure_rate: number;
  top_gateways: Array<{
    gateway: string;
    count: number;
    amount: number;
  }>;
  error_breakdown: Array<{
    error_code: string;
    count: number;
    severity: string;
  }>;
  daily_stats: Array<{
    date: string;
    transactions: number;
    amount: number;
    success_rate: number;
  }>;
}

interface PaymentAnalyticsProps {
  className?: string;
}

export const PaymentAnalyticsDashboard: React.FC<PaymentAnalyticsProps> = ({ className = '' }) => {
  const [metrics, setMetrics] = useState<PaymentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [selectedGateway, setSelectedGateway] = useState('all');
  const supabase = useSupabaseClient();

  const timeRangeOptions = [
    { value: '1d', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' }
  ];

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get basic payment metrics
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', getDateRange(timeRange))
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Get error analytics
      const { data: errorStats, error: errorError } = await supabase
        .from('payment_error_logs')
        .select('error_code, severity, gateway, created_at')
        .gte('created_at', getDateRange(timeRange));

      if (errorError) throw errorError;

      // Get webhook logs
      const { data: webhookLogs, error: webhookError } = await supabase
        .from('webhook_logs')
        .select('*')
        .gte('created_at', getDateRange(timeRange));

      if (webhookError) throw webhookError;

      // Process metrics
      const processedMetrics = processPaymentMetrics(payments || [], errorStats || [], webhookLogs || []);
      setMetrics(processedMetrics);
    } catch (err) {
      console.error('Error fetching payment metrics:', err);
      setError(err.message || 'Failed to fetch payment analytics');
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (range: string): string => {
    const now = new Date();
    const days = parseInt(range);
    const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return date.toISOString();
  };

  const processPaymentMetrics = (payments: any[], errors: any[], webhooks: any[]): PaymentMetrics => {
    const total = payments.length;
    const successful = payments.filter(p => p.status === 'success').length;
    const failed = payments.filter(p => p.status === 'failed').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const avgAmount = total > 0 ? totalAmount / total : 0;
    
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    // Gateway breakdown
    const gatewayStats = payments.reduce((acc, p) => {
      const gateway = p.gateway || 'unknown';
      if (!acc[gateway]) {
        acc[gateway] = { count: 0, amount: 0 };
      }
      acc[gateway].count++;
      acc[gateway].amount += p.amount || 0;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    const topGateways = Object.entries(gatewayStats)
      .map(([gateway, stats]) => ({ gateway, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Error breakdown
    const errorBreakdown = errors.reduce((acc, err) => {
      const code = err.error_code || 'unknown';
      if (!acc[code]) {
        acc[code] = { count: 0, severity: err.severity || 'medium' };
      }
      acc[code].count++;
      return acc;
    }, {} as Record<string, { count: number; severity: string }>);

    const topErrors = Object.entries(errorBreakdown)
      .map(([error_code, stats]) => ({ error_code, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Daily stats
    const dailyStats = getDailyStats(payments, parseInt(timeRange));

    return {
      total_transactions: total,
      successful_transactions: successful,
      failed_transactions: failed,
      pending_transactions: pending,
      total_amount: totalAmount,
      average_amount: avgAmount,
      success_rate: successRate,
      failure_rate: failureRate,
      top_gateways: topGateways,
      error_breakdown: topErrors,
      daily_stats: dailyStats
    };
  };

  const getDailyStats = (payments: any[], days: number): Array<{
    date: string;
    transactions: number;
    amount: number;
    success_rate: number;
  }> => {
    const stats: Record<string, { transactions: number; amount: number; successful: number }> = {};
    
    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      stats[dateKey] = { transactions: 0, amount: 0, successful: 0 };
    }

    // Process payments
    payments.forEach(payment => {
      const date = new Date(payment.created_at).toISOString().split('T')[0];
      if (stats[date]) {
        stats[date].transactions++;
        stats[date].amount += payment.amount || 0;
        if (payment.status === 'success') {
          stats[date].successful++;
        }
      }
    });

    return Object.entries(stats)
      .map(([date, data]) => ({
        date,
        transactions: data.transactions,
        amount: data.amount,
        success_rate: data.transactions > 0 ? (data.successful / data.transactions) * 100 : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeRange, selectedGateway]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading payment analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>No payment data available</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Payment Analytics</h2>
          <p className="text-muted-foreground">
            Monitor payment performance and identify issues
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={fetchMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_transactions}</div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(metrics.total_amount)} total volume
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPercentage(metrics.success_rate)}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.successful_transactions} successful
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failure Rate</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatPercentage(metrics.failure_rate)}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.failed_transactions} failed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.average_amount)}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.pending_transactions} pending
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="gateways" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gateways">Payment Gateways</TabsTrigger>
          <TabsTrigger value="errors">Error Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="gateways" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Payment Gateways</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.top_gateways.map((gateway, index) => (
                  <div key={gateway.gateway} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{gateway.gateway.toUpperCase()}</div>
                        <div className="text-sm text-muted-foreground">
                          {gateway.count} transactions
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(gateway.amount)}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPercentage((gateway.count / metrics.total_transactions) * 100)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Common Payment Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.error_breakdown.map((error, index) => (
                  <div key={error.error_code} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div>
                        <div className="font-medium">{error.error_code}</div>
                        <Badge 
                          variant={error.severity === 'high' ? 'destructive' : 'secondary'}
                          className="mt-1"
                        >
                          {error.severity}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{error.count}</div>
                      <div className="text-sm text-muted-foreground">occurrences</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Transaction Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.daily_stats.slice(-7).map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">
                        {new Date(day.date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {day.transactions} transactions
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(day.amount)}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatPercentage(day.success_rate)} success
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};