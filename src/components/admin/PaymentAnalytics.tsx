import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Activity,
  Calendar,
  Download,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { PaymentGateway, PaymentAnalytics as PaymentAnalyticsData } from '@/types/payment';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface PaymentStats {
  total_transactions: number;
  total_amount: number;
  success_rate: number;
  average_amount: number;
  gateway_breakdown: Record<PaymentGateway, {
    count: number;
    amount: number;
    success_rate: number;
  }>;
  recent_transactions: Array<{
    id: string;
    amount: number;
    currency: string;
    gateway: PaymentGateway;
    status: string;
    created_at: string;
  }>;
}

export const PaymentAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d, 1y
  const [currency, setCurrency] = useState('USD');

  // Fetch payment analytics
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['payment-analytics', timeRange, currency],
    queryFn: async (): Promise<PaymentStats> => {
      const { data: transactions, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .gte('created_at', getDateFromRange(timeRange))
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate statistics
      const totalTransactions = transactions.length;
      const successfulTransactions = transactions.filter(t => t.status === 'completed');
      const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const successRate = totalTransactions > 0 ? (successfulTransactions.length / totalTransactions) * 100 : 0;
      const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

      // Gateway breakdown
      const gatewayBreakdown: Record<PaymentGateway, any> = {
        stripe: { count: 0, amount: 0, success_rate: 0 },
        payu: { count: 0, amount: 0, success_rate: 0 },
        esewa: { count: 0, amount: 0, success_rate: 0 },
        khalti: { count: 0, amount: 0, success_rate: 0 },
        fonepay: { count: 0, amount: 0, success_rate: 0 },
        airwallex: { count: 0, amount: 0, success_rate: 0 },
        bank_transfer: { count: 0, amount: 0, success_rate: 0 },
        cod: { count: 0, amount: 0, success_rate: 0 }
      };

      transactions.forEach(transaction => {
        const gateway = transaction.gateway_code as PaymentGateway;
        if (gatewayBreakdown[gateway]) {
          gatewayBreakdown[gateway].count++;
          gatewayBreakdown[gateway].amount += transaction.amount || 0;
          
          if (transaction.status === 'completed') {
            gatewayBreakdown[gateway].success_rate++;
          }
        }
      });

      // Calculate success rates for each gateway
      Object.keys(gatewayBreakdown).forEach(gateway => {
        const g = gateway as PaymentGateway;
        if (gatewayBreakdown[g].count > 0) {
          gatewayBreakdown[g].success_rate = (gatewayBreakdown[g].success_rate / gatewayBreakdown[g].count) * 100;
        }
      });

      return {
        total_transactions: totalTransactions,
        total_amount: totalAmount,
        success_rate: successRate,
        average_amount: averageAmount,
        gateway_breakdown: gatewayBreakdown,
        recent_transactions: transactions.slice(0, 10).map(t => ({
          id: t.id,
          amount: t.amount || 0,
          currency: t.currency,
          gateway: t.gateway_code as PaymentGateway,
          status: t.status,
          created_at: t.created_at
        }))
      };
    }
  });

  const getDateFromRange = (range: string): string => {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const formatCurrency = (amount: number, curr: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getGatewayIcon = (gateway: PaymentGateway) => {
    switch (gateway) {
      case 'stripe':
      case 'payu':
      case 'airwallex':
        return <CreditCard className="h-4 w-4" />;
      case 'esewa':
      case 'khalti':
      case 'fonepay':
        return <Activity className="h-4 w-4" />;
      case 'bank_transfer':
        return <Users className="h-4 w-4" />;
      case 'cod':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No payment data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Payment Analytics</h2>
          <p className="text-muted-foreground">
            Monitor payment performance and gateway statistics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
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
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_transactions}</div>
            <p className="text-xs text-muted-foreground">
              {timeRange === '7d' ? 'This week' : `Last ${timeRange}`}
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
              {formatCurrency(analytics.total_amount, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {timeRange === '7d' ? 'This week' : `Last ${timeRange}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.success_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Successful payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.average_amount, currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gateway Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Gateway Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.gateway_breakdown)
                .filter(([_, data]) => data.count > 0)
                .sort(([_, a], [__, b]) => b.amount - a.amount)
                .map(([gateway, data]) => (
                  <div key={gateway} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getGatewayIcon(gateway as PaymentGateway)}
                      <div>
                        <p className="font-medium capitalize">{gateway.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">
                          {data.count} transactions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(data.amount, currency)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {data.success_rate.toFixed(1)}% success
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.recent_transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getGatewayIcon(transaction.gateway)}
                    <div>
                      <p className="font-medium">
                        {formatCurrency(transaction.amount, transaction.currency)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {transaction.gateway}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Transactions
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 