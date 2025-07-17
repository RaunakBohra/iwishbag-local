import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Activity,
  PieChart,
  BarChart3,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface CurrencyStats {
  currency: string;
  totalPayments: number;
  totalRefunds: number;
  netAmount: number;
  paymentCount: number;
  refundCount: number;
  averageAmount: number;
  lastPaymentDate?: string;
}

interface CurrencyMismatch {
  quote_id: string;
  order_display_id?: string;
  quote_currency: string;
  payment_currency: string;
  quote_amount: number;
  payment_amount: number;
  created_at: string;
  suspicious: boolean;
}

interface ExchangeRateAlert {
  currency: string;
  current_rate: number;
  previous_rate: number;
  change_percent: number;
  last_updated: string;
  alert_threshold: number;
}

export function CurrencyMonitoringDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Fetch currency statistics
  const { data: currencyStats, isLoading: statsLoading } = useQuery({
    queryKey: ['currency-stats', selectedTimeRange],
    queryFn: async () => {
      const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('payment_ledger')
        .select(
          `
          currency,
          amount,
          payment_type,
          status,
          payment_date
        `,
        )
        .gte('payment_date', startDate.toISOString())
        .eq('status', 'completed');

      if (error) throw error;

      // Process data into currency statistics
      const statsMap = new Map<string, CurrencyStats>();

      data?.forEach((payment) => {
        const currency = payment.currency;
        const amount = parseFloat(payment.amount);

        if (!statsMap.has(currency)) {
          statsMap.set(currency, {
            currency,
            totalPayments: 0,
            totalRefunds: 0,
            netAmount: 0,
            paymentCount: 0,
            refundCount: 0,
            averageAmount: 0,
            lastPaymentDate: undefined,
          });
        }

        const stats = statsMap.get(currency)!;

        if (payment.payment_type === 'customer_payment') {
          stats.totalPayments += amount;
          stats.paymentCount += 1;
          stats.lastPaymentDate = payment.payment_date;
        } else if (payment.payment_type === 'refund' || payment.payment_type === 'partial_refund') {
          stats.totalRefunds += amount;
          stats.refundCount += 1;
        }

        stats.netAmount = stats.totalPayments - stats.totalRefunds;
        stats.averageAmount = stats.paymentCount > 0 ? stats.totalPayments / stats.paymentCount : 0;
      });

      return Array.from(statsMap.values()).sort((a, b) => b.netAmount - a.netAmount);
    },
  });

  // Fetch currency mismatches
  const { data: currencyMismatches, isLoading: mismatchesLoading } = useQuery({
    queryKey: ['currency-mismatches', selectedTimeRange],
    queryFn: async () => {
      const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase.rpc('get_currency_mismatches', {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString(),
      });

      if (error) {
        console.error('Currency mismatches query failed:', error);
        return [];
      }

      return (data as CurrencyMismatch[]).map((mismatch) => ({
        ...mismatch,
        suspicious:
          Math.abs(mismatch.quote_amount - mismatch.payment_amount) < 0.01 &&
          mismatch.quote_currency !== mismatch.payment_currency,
      }));
    },
  });

  // Fetch exchange rate alerts
  const { data: exchangeRateAlerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['exchange-rate-alerts'],
    queryFn: async () => {
      // This would connect to a real exchange rate monitoring system
      // For now, return mock data
      const mockAlerts: ExchangeRateAlert[] = [
        {
          currency: 'INR',
          current_rate: 85.2,
          previous_rate: 83.1,
          change_percent: 2.53,
          last_updated: new Date().toISOString(),
          alert_threshold: 2.0,
        },
        {
          currency: 'EUR',
          current_rate: 0.92,
          previous_rate: 0.89,
          change_percent: 3.37,
          last_updated: new Date().toISOString(),
          alert_threshold: 3.0,
        },
      ];

      return mockAlerts.filter((alert) => Math.abs(alert.change_percent) >= alert.alert_threshold);
    },
  });

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMismatchSeverity = (mismatch: CurrencyMismatch): 'low' | 'medium' | 'high' => {
    if (mismatch.suspicious) return 'high';
    if (Math.abs(mismatch.quote_amount - mismatch.payment_amount) / mismatch.quote_amount > 0.1) {
      return 'medium';
    }
    return 'low';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Currency Monitoring</h2>
          <p className="text-gray-600">
            Monitor exchange rates, currency mismatches, and payment analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="border rounded px-3 py-2"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-red-600">
                  {(exchangeRateAlerts?.length || 0) +
                    (currencyMismatches?.filter((m) => m.suspicious).length || 0)}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Currency Mismatches</p>
                <p className="text-2xl font-bold text-orange-600">
                  {currencyMismatches?.length || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Currencies</p>
                <p className="text-2xl font-bold text-blue-600">{currencyStats?.length || 0}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Net Volume</p>
                <p className="text-2xl font-bold text-green-600">
                  $
                  {currencyStats?.reduce((sum, stat) => sum + stat.netAmount, 0).toLocaleString() ||
                    '0'}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="mismatches">Currency Mismatches</TabsTrigger>
          <TabsTrigger value="rates">Exchange Rates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Currency Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Currency Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-center py-8">Loading currency statistics...</div>
              ) : (
                <div className="space-y-4">
                  {currencyStats?.map((stat) => (
                    <div
                      key={stat.currency}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <Badge variant="outline" className="font-mono">
                            {stat.currency}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Payments:</span>
                            <span className="ml-2 font-medium">{stat.paymentCount}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Refunds:</span>
                            <span className="ml-2 font-medium">{stat.refundCount}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">${stat.netAmount.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">
                          Avg: ${stat.averageAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mismatches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Currency Mismatches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mismatchesLoading ? (
                <div className="text-center py-8">Loading currency mismatches...</div>
              ) : currencyMismatches?.length === 0 ? (
                <div className="text-center py-8 text-green-600">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                  No currency mismatches detected
                </div>
              ) : (
                <div className="space-y-3">
                  {currencyMismatches?.map((mismatch, index) => {
                    const severity = getMismatchSeverity(mismatch);
                    return (
                      <div
                        key={index}
                        className={cn('p-4 border rounded-lg', getSeverityColor(severity))}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                Order {mismatch.order_display_id || mismatch.quote_id.slice(-8)}
                              </Badge>
                              {mismatch.suspicious && (
                                <Badge variant="destructive" className="text-xs">
                                  Suspicious
                                </Badge>
                              )}
                            </div>
                            <div className="mt-2 text-sm">
                              <div>
                                Quote: {mismatch.quote_currency}{' '}
                                {mismatch.quote_amount.toLocaleString()}
                              </div>
                              <div>
                                Payment: {mismatch.payment_currency}{' '}
                                {mismatch.payment_amount.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            {formatDistanceToNow(new Date(mismatch.created_at), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Exchange Rate Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="text-center py-8">Loading exchange rate data...</div>
              ) : exchangeRateAlerts?.length === 0 ? (
                <div className="text-center py-8 text-green-600">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                  All exchange rates are stable
                </div>
              ) : (
                <div className="space-y-3">
                  {exchangeRateAlerts?.map((alert) => (
                    <div
                      key={alert.currency}
                      className="p-4 border border-orange-200 bg-orange-50 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">
                              {alert.currency}
                            </Badge>
                            <Badge
                              variant={alert.change_percent > 0 ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {alert.change_percent > 0 ? (
                                <TrendingUp className="h-2 w-2 mr-1" />
                              ) : (
                                <TrendingDown className="h-2 w-2 mr-1" />
                              )}
                              {Math.abs(alert.change_percent).toFixed(2)}%
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm">
                            <div>Current: {alert.current_rate}</div>
                            <div>Previous: {alert.previous_rate}</div>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-600">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {formatDistanceToNow(new Date(alert.last_updated), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Payment Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                Advanced analytics coming soon
                <p className="text-sm mt-2">This section will include detailed charts and trends</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
