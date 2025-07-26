import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ErrorType, ErrorSeverity } from '@/lib/errorHandling';
import { format, subHours, subDays } from 'date-fns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ErrorMetrics {
  total: number;
  byType: Record<ErrorType, number>;
  bySeverity: Record<ErrorSeverity, number>;
  byComponent: Record<string, number>;
  timeline: Array<{
    timestamp: string;
    count: number;
    critical: number;
  }>;
  recentErrors: Array<{
    id: string;
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    component: string;
    userId?: string;
    timestamp: Date;
    resolved: boolean;
  }>;
  resolutionRate: number;
  mttr: number; // Mean Time To Resolution in minutes
}

export function ErrorMonitoringDashboard() {
  const [timeRange, setTimeRange] = useState('24h');
  const [filterType, setFilterType] = useState<ErrorType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<ErrorSeverity | 'all'>('all');

  // Fetch error metrics
  const {
    data: metrics,
    isLoading,
    refetch,
  } = useQuery<ErrorMetrics>({
    queryKey: ['error-metrics', timeRange, filterType, filterSeverity],
    queryFn: async () => {
      // In production, this would fetch from your error tracking service
      // For now, returning mock data
      return getMockErrorMetrics(timeRange);
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Colors for charts
  const severityColors = {
    [ErrorSeverity.CRITICAL]: '#dc2626',
    [ErrorSeverity.HIGH]: '#f97316',
    [ErrorSeverity.MEDIUM]: '#eab308',
    [ErrorSeverity.LOW]: '#3b82f6',
  };

  const typeColors = {
    [ErrorType.NETWORK]: '#8b5cf6',
    [ErrorType.DATABASE]: '#ec4899',
    [ErrorType.CALCULATION]: '#10b981',
    [ErrorType.VALIDATION]: '#f59e0b',
    [ErrorType.AUTHENTICATION]: '#6366f1',
    [ErrorType.PERMISSION]: '#ef4444',
    [ErrorType.DATA_INTEGRITY]: '#14b8a6',
    [ErrorType.UNKNOWN]: '#6b7280',
  };

  // Calculate error trend
  const errorTrend = metrics ? calculateTrend(metrics.timeline) : 0;
  const isIncreasing = errorTrend > 0;

  // Export error report
  const exportReport = () => {
    if (!metrics) return;

    const report = {
      generated: new Date().toISOString(),
      timeRange,
      metrics: {
        total: metrics.total,
        resolutionRate: `${metrics.resolutionRate}%`,
        mttr: `${metrics.mttr} minutes`,
        byType: metrics.byType,
        bySeverity: metrics.bySeverity,
      },
      recentErrors: metrics.recentErrors,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!metrics) {
    return <div>Error loading metrics</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Error Monitoring</h2>
          <p className="text-muted-foreground">Track and analyze system errors in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{metrics.total}</span>
              <div
                className={`flex items-center text-sm ${isIncreasing ? 'text-red-600' : 'text-green-600'}`}
              >
                {isIncreasing ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{Math.abs(errorTrend)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-600">
                {metrics.bySeverity[ErrorSeverity.CRITICAL] || 0}
              </span>
              <Badge variant="destructive" className="text-xs">
                Immediate Action
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Resolution Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <span className="text-2xl font-bold">{metrics.resolutionRate}%</span>
              <Progress value={metrics.resolutionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Resolution Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{metrics.mttr}</span>
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="components">By Component</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Timeline</CardTitle>
              <CardDescription>Error frequency over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                    />
                    <YAxis />
                    <Tooltip labelFormatter={(value) => format(new Date(value), 'MMM dd, HH:mm')} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      name="Total Errors"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="critical"
                      stroke="#dc2626"
                      name="Critical"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>By Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(metrics.bySeverity).map(([severity, count]) => ({
                          name: severity,
                          value: count,
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(metrics.bySeverity).map(([severity], index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={severityColors[severity as ErrorSeverity]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>By Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(metrics.byType).map(([type, count]) => ({
                        type,
                        count,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" angle={-45} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6">
                        {Object.entries(metrics.byType).map(([type], index) => (
                          <Cell key={`cell-${index}`} fill={typeColors[type as ErrorType]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="components" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Errors by Component</CardTitle>
              <CardDescription>Top 10 components with most errors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(metrics.byComponent)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([component, count]) => (
                    <div key={component} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{component}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={(count / metrics.total) * 100} className="w-24 h-2" />
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Errors</CardTitle>
          <CardDescription>Latest errors requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.recentErrors.slice(0, 5).map((error) => (
              <div
                key={error.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className={`h-5 w-5 mt-0.5 ${
                      error.severity === ErrorSeverity.CRITICAL
                        ? 'text-red-600'
                        : error.severity === ErrorSeverity.HIGH
                          ? 'text-orange-600'
                          : 'text-yellow-600'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm">{error.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {error.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{error.component}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(error.timestamp, 'HH:mm:ss')}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant={error.resolved ? 'secondary' : 'destructive'} className="text-xs">
                  {error.resolved ? 'Resolved' : 'Active'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
function calculateTrend(timeline: ErrorMetrics['timeline']): number {
  if (timeline.length < 2) return 0;

  const recent = timeline.slice(-Math.ceil(timeline.length / 2));
  const previous = timeline.slice(0, Math.floor(timeline.length / 2));

  const recentAvg = recent.reduce((sum, t) => sum + t.count, 0) / recent.length;
  const previousAvg = previous.reduce((sum, t) => sum + t.count, 0) / previous.length;

  if (previousAvg === 0) return 0;
  return Math.round(((recentAvg - previousAvg) / previousAvg) * 100);
}

// Mock data generator
function getMockErrorMetrics(timeRange: string): ErrorMetrics {
  const now = new Date();
  const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;

  const timeline = Array.from({ length: Math.min(hours, 24) }, (_, i) => ({
    timestamp: subHours(now, i).toISOString(),
    count: Math.floor(Math.random() * 50) + 10,
    critical: Math.floor(Math.random() * 5),
  })).reverse();

  return {
    total: 342,
    byType: {
      [ErrorType.NETWORK]: 89,
      [ErrorType.DATABASE]: 67,
      [ErrorType.CALCULATION]: 45,
      [ErrorType.VALIDATION]: 78,
      [ErrorType.AUTHENTICATION]: 23,
      [ErrorType.PERMISSION]: 15,
      [ErrorType.DATA_INTEGRITY]: 12,
      [ErrorType.UNKNOWN]: 13,
    },
    bySeverity: {
      [ErrorSeverity.CRITICAL]: 12,
      [ErrorSeverity.HIGH]: 67,
      [ErrorSeverity.MEDIUM]: 145,
      [ErrorSeverity.LOW]: 118,
    },
    byComponent: {
      UnifiedQuoteInterface: 45,
      QuoteCalculatorService: 38,
      SmartCalculationEngine: 32,
      TaxCalculationSidebar: 28,
      PaymentProcessor: 25,
      ShippingCalculator: 22,
      CurrencyService: 20,
      HSNSearchService: 18,
      CustomerPortal: 15,
      AdminDashboard: 12,
    },
    timeline,
    recentErrors: [
      {
        id: '1',
        type: ErrorType.CALCULATION,
        severity: ErrorSeverity.HIGH,
        message: 'Failed to calculate customs duty for quote #Q-2024-0892',
        component: 'QuoteCalculatorService',
        userId: 'user123',
        timestamp: subHours(now, 0.5),
        resolved: false,
      },
      {
        id: '2',
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: 'Timeout fetching exchange rates from API',
        component: 'CurrencyService',
        timestamp: subHours(now, 1),
        resolved: true,
      },
      {
        id: '3',
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: 'Invalid customs percentage value: 10000',
        component: 'TaxCalculationSidebar',
        userId: 'admin456',
        timestamp: subHours(now, 2),
        resolved: true,
      },
      {
        id: '4',
        type: ErrorType.DATABASE,
        severity: ErrorSeverity.CRITICAL,
        message: 'Connection pool exhausted - unable to save quote',
        component: 'UnifiedDataEngine',
        timestamp: subHours(now, 3),
        resolved: false,
      },
      {
        id: '5',
        type: ErrorType.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        message: 'Session expired during quote checkout',
        component: 'PaymentProcessor',
        userId: 'user789',
        timestamp: subHours(now, 4),
        resolved: true,
      },
    ],
    resolutionRate: 78,
    mttr: 23,
  };
}
