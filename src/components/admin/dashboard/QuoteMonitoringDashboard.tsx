import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Activity,
  AlertCircle,
  TrendingUp,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Timer,
  DollarSign,
  ShoppingCart,
} from 'lucide-react';
import {
  getQuoteCalculationMetrics,
  getQuoteBusinessMetrics,
  getAlertSummary,
  Alert,
  PerformanceMetrics,
  BusinessMetrics,
  AlertSummary,
} from '@/services/ErrorHandlingService';
import { cn } from '@/lib/utils';

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: number;
  status?: 'success' | 'warning' | 'error' | 'neutral';
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  status = 'neutral',
}: MetricCardProps) {
  const statusColors = {
    success: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    warning: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    error: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    neutral: 'text-gray-600 bg-gray-50 dark:bg-gray-900/20',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn('rounded-lg p-2', statusColors[status])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {trend !== undefined && (
          <div className="flex items-center mt-2">
            <TrendingUp
              className={cn('h-3 w-3 mr-1', trend >= 0 ? 'text-green-600' : 'text-red-600')}
            />
            <span className={cn('text-xs', trend >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend >= 0 ? '+' : ''}
              {trend}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Error Distribution Chart
function ErrorDistribution({ topErrors }: { topErrors: Array<{ code: string; count: number }> }) {
  const maxCount = Math.max(...topErrors.map((e) => e.count), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Error Codes</CardTitle>
        <CardDescription>Most frequent errors in the last hour</CardDescription>
      </CardHeader>
      <CardContent>
        {topErrors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No errors recorded</p>
        ) : (
          <div className="space-y-3">
            {topErrors.map(({ code, count }) => (
              <div key={code} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">{code}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <Progress value={(count / maxCount) * 100} className="h-2" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Alert List Component
function AlertList({ alerts }: { alerts: Alert[] }) {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-teal-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Alerts</CardTitle>
        <CardDescription>Latest system alerts and notifications</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent alerts</p>
        ) : (
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert, index) => (
              <div
                key={alert.id || index}
                className="flex items-start gap-3 pb-3 border-b last:border-0"
              >
                {getSeverityIcon(alert.severity)}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{alert.errorCode}</span>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{alert.errorCount} occurrences</span>
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
export function QuoteMonitoringDashboard() {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [businessMetrics, setBusinessMetrics] = useState<BusinessMetrics | null>(null);
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch all metrics
  const fetchMetrics = async () => {
    setIsRefreshing(true);
    try {
      const [perf, business, alerts] = await Promise.all([
        getQuoteCalculationMetrics(60), // Last hour
        getQuoteBusinessMetrics(false),
        getAlertSummary(),
      ]);

      setPerformanceMetrics(perf);
      setBusinessMetrics(business);
      setAlertSummary(alerts);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching monitoring metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial fetch and auto-refresh setup
  useEffect(() => {
    fetchMetrics();

    // Auto-refresh every 30 seconds
    const interval = autoRefresh ? setInterval(fetchMetrics, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Calculate derived metrics
  const calculateHealthScore = () => {
    if (!performanceMetrics) return 0;

    const successWeight = 0.4;
    const speedWeight = 0.3;
    const errorWeight = 0.3;

    const successScore = performanceMetrics.successRate || 0;
    const speedScore = Math.max(0, 100 - performanceMetrics.averageCalculationTime / 50); // 5s = 0 score
    const errorScore = Math.max(0, 100 - performanceMetrics.errorRate);

    return Math.round(
      successScore * successWeight + speedScore * speedWeight + errorScore * errorWeight,
    );
  };

  const healthScore = calculateHealthScore();
  const healthStatus = healthScore >= 90 ? 'success' : healthScore >= 70 ? 'warning' : 'error';

  if (!performanceMetrics || !businessMetrics || !alertSummary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quote System Monitoring</h2>
          <p className="text-muted-foreground">Real-time performance metrics and system health</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={isRefreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={healthScore} className="h-4" />
            </div>
            <div className="text-2xl font-bold">
              <Badge
                variant={
                  healthStatus === 'success'
                    ? 'default'
                    : healthStatus === 'warning'
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {healthScore}%
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Based on success rate, performance, and error frequency
          </p>
        </CardContent>
      </Card>

      {/* Tabs for different metric views */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="business">Business Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts & Errors</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Calculations"
              value={performanceMetrics.totalCalculations}
              description="Last hour"
              icon={Activity}
              status="neutral"
            />
            <MetricCard
              title="Success Rate"
              value={`${performanceMetrics.successRate.toFixed(1)}%`}
              description={`${performanceMetrics.totalCalculations - Math.round((performanceMetrics.totalCalculations * performanceMetrics.errorRate) / 100)} successful`}
              icon={CheckCircle}
              status={
                performanceMetrics.successRate >= 95
                  ? 'success'
                  : performanceMetrics.successRate >= 90
                    ? 'warning'
                    : 'error'
              }
            />
            <MetricCard
              title="Avg. Calculation Time"
              value={`${Math.round(performanceMetrics.averageCalculationTime)}ms`}
              description="Average response time"
              icon={Timer}
              status={
                performanceMetrics.averageCalculationTime < 2000
                  ? 'success'
                  : performanceMetrics.averageCalculationTime < 5000
                    ? 'warning'
                    : 'error'
              }
            />
            <MetricCard
              title="Slow Calculations"
              value={performanceMetrics.slowCalculations}
              description=">5s response time"
              icon={Clock}
              status={performanceMetrics.slowCalculations === 0 ? 'success' : 'warning'}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>System performance over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Error Rate</span>
                      <span className="text-sm text-muted-foreground">
                        {performanceMetrics.errorRate.toFixed(2)}%
                      </span>
                    </div>
                    <Progress
                      value={performanceMetrics.errorRate}
                      className="h-2"
                      // @ts-expect-error - custom color prop
                      indicatorClassName={
                        performanceMetrics.errorRate > 5 ? 'bg-red-500' : 'bg-green-500'
                      }
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Anomalous Calculations</span>
                      <span className="text-sm text-muted-foreground">
                        {performanceMetrics.anomalousCalculations}
                      </span>
                    </div>
                    <Progress
                      value={
                        (performanceMetrics.anomalousCalculations /
                          Math.max(performanceMetrics.totalCalculations, 1)) *
                        100
                      }
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <ErrorDistribution topErrors={performanceMetrics.topErrors || []} />
          </div>
        </TabsContent>

        {/* Business Metrics Tab */}
        <TabsContent value="business" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Quotes Generated"
              value={businessMetrics.quotesGenerated}
              description="Last 24 hours"
              icon={ShoppingCart}
              status="neutral"
            />
            <MetricCard
              title="Conversion Rate"
              value={`${businessMetrics.conversionRate.toFixed(1)}%`}
              description="Quote to order"
              icon={TrendingUp}
              status={
                businessMetrics.conversionRate >= 20
                  ? 'success'
                  : businessMetrics.conversionRate >= 10
                    ? 'warning'
                    : 'error'
              }
            />
            <MetricCard
              title="Abandonment Rate"
              value={`${businessMetrics.abandonmentRate.toFixed(1)}%`}
              description="Incomplete quotes"
              icon={XCircle}
              status={
                businessMetrics.abandonmentRate <= 30
                  ? 'success'
                  : businessMetrics.abandonmentRate <= 50
                    ? 'warning'
                    : 'error'
              }
            />
            <MetricCard
              title="Avg. Quote Value"
              value={`$${businessMetrics.averageQuoteValue.toFixed(2)}`}
              description="Average total"
              icon={DollarSign}
              status="neutral"
            />
          </div>

          {businessMetrics.topCountries && businessMetrics.topCountries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Countries</CardTitle>
                <CardDescription>Most active quote destinations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {businessMetrics.topCountries.map(({ country, count }) => (
                    <div key={country} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{country}</span>
                      <Badge variant="outline">{count} quotes</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Total Alerts"
              value={alertSummary.totalAlerts}
              description="All time"
              icon={AlertCircle}
              status="neutral"
            />
            <MetricCard
              title="Critical Alerts"
              value={alertSummary.criticalAlerts}
              description="Last 24 hours"
              icon={XCircle}
              status={alertSummary.criticalAlerts === 0 ? 'success' : 'error'}
            />
            <MetricCard
              title="Warning Alerts"
              value={alertSummary.warningAlerts}
              description="Last 24 hours"
              icon={AlertTriangle}
              status={alertSummary.warningAlerts === 0 ? 'success' : 'warning'}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <AlertList alerts={alertSummary.recentAlerts} />

            <Card>
              <CardHeader>
                <CardTitle>Alert Distribution</CardTitle>
                <CardDescription>Most frequent alert types</CardDescription>
              </CardHeader>
              <CardContent>
                {alertSummary.topAlertCodes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No alerts recorded</p>
                ) : (
                  <div className="space-y-3">
                    {alertSummary.topAlertCodes.map(({ code, count }) => (
                      <div key={code} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-mono text-xs">{code}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <Progress
                          value={
                            (count /
                              Math.max(...alertSummary.topAlertCodes.map((a) => a.count), 1)) *
                            100
                          }
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* System Status Alert */}
      {healthScore < 70 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>System Health Warning</AlertTitle>
          <AlertDescription>
            The quote calculation system is experiencing degraded performance. Please check the
            error logs and recent alerts for more information.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
