import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  Eye,
  Search,
  MousePointer,
  Smartphone,
  Monitor,
  Globe,
  Database,
  Server,
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  Settings,
  BarChart3,
  PieChart,
  LineChart,
  Filter,
  Calendar,
  Target,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuoteTheme } from '@/contexts/QuoteThemeContext';

// Real-time performance monitoring
interface PerformanceMetrics {
  // Component Performance
  componentRenderTimes: Record<string, number[]>;
  componentErrorRates: Record<string, number>;

  // User Experience
  pageLoadTimes: number[];
  searchResponseTimes: number[];
  actionResponseTimes: Record<string, number[]>;

  // Business Metrics
  conversionRates: {
    quoteApproval: number;
    addToCart: number;
    checkout: number;
  };

  // System Health
  cacheHitRates: Record<string, number>;
  apiResponseTimes: Record<string, number[]>;
  errorRates: Record<string, number>;

  // A/B Testing
  colorVariantPerformance: Record<
    string,
    {
      conversions: number;
      views: number;
      revenue: number;
    }
  >;

  // Device & Browser
  deviceBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  pwinstallRate: number;
}

// Mock data generator (in production, this would come from analytics)
const generateMockMetrics = (): PerformanceMetrics => ({
  componentRenderTimes: {
    UnifiedQuoteCard: [45, 52, 38, 41, 48, 44, 39, 43, 46, 50],
    UnifiedQuoteBreakdown: [89, 95, 82, 87, 91, 85, 88, 93, 86, 90],
    UnifiedQuoteActions: [23, 28, 21, 25, 29, 24, 26, 27, 22, 30],
    UnifiedQuoteForm: [156, 162, 148, 153, 159, 151, 157, 164, 149, 160],
    UnifiedQuoteList: [234, 245, 221, 238, 251, 229, 241, 247, 235, 243],
  },
  componentErrorRates: {
    UnifiedQuoteCard: 0.02,
    UnifiedQuoteBreakdown: 0.01,
    UnifiedQuoteActions: 0.03,
    UnifiedQuoteForm: 0.05,
    UnifiedQuoteList: 0.02,
  },
  pageLoadTimes: [1240, 1180, 1320, 1290, 1150, 1380, 1220, 1260, 1300, 1190],
  searchResponseTimes: [85, 92, 78, 89, 95, 82, 87, 93, 80, 91],
  actionResponseTimes: {
    approve: [120, 135, 110, 125, 140, 115, 130, 145, 118, 128],
    addToCart: [95, 102, 88, 97, 105, 91, 99, 108, 93, 100],
    checkout: [450, 480, 420, 465, 490, 435, 475, 495, 445, 470],
  },
  conversionRates: {
    quoteApproval: 0.342,
    addToCart: 0.567,
    checkout: 0.234,
  },
  cacheHitRates: {
    QuoteListCache: 0.847,
    CurrencyService: 0.923,
    QuoteCalculator: 0.756,
  },
  apiResponseTimes: {
    quotes: [145, 152, 138, 147, 155, 141, 149, 158, 143, 151],
    customers: [98, 105, 92, 101, 108, 95, 103, 110, 97, 104],
    payments: [234, 245, 221, 238, 251, 229, 241, 247, 235, 243],
  },
  errorRates: {
    api: 0.018,
    client: 0.023,
    network: 0.012,
  },
  colorVariantPerformance: {
    control: { conversions: 1247, views: 3651, revenue: 89340 },
    urgency_boost: { conversions: 1389, views: 3702, revenue: 97520 },
    warmth_focused: { conversions: 1312, views: 3598, revenue: 91280 },
    trust_maximized: { conversions: 1356, views: 3689, revenue: 94760 },
  },
  deviceBreakdown: {
    mobile: 0.612,
    desktop: 0.298,
    tablet: 0.09,
  },
  browserBreakdown: {
    chrome: 0.634,
    safari: 0.228,
    firefox: 0.089,
    edge: 0.049,
  },
  pwinstallRate: 0.156,
});

// Metric calculation utilities
const calculateAverage = (values: number[]): number => {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

const calculatePercentile = (values: number[], percentile: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
};

const calculateTrend = (values: number[]): 'up' | 'down' | 'stable' => {
  if (values.length < 2) return 'stable';
  const recent = values.slice(-3);
  const previous = values.slice(-6, -3);

  if (recent.length === 0 || previous.length === 0) return 'stable';

  const recentAvg = calculateAverage(recent);
  const previousAvg = calculateAverage(previous);
  const change = (recentAvg - previousAvg) / previousAvg;

  if (Math.abs(change) < 0.05) return 'stable';
  return change > 0 ? 'up' : 'down';
};

// Metric card component
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
  status?: 'good' | 'warning' | 'critical';
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  status = 'good',
  className,
}) => {
  const statusColors = {
    good: 'text-green-600 bg-green-50 border-green-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
  };

  const trendIcons = {
    up: <TrendingUp className="h-3 w-3 text-green-600" />,
    down: <TrendingDown className="h-3 w-3 text-red-600" />,
    stable: <div className="h-3 w-3 rounded-full bg-gray-400" />,
  };

  return (
    <Card
      className={cn('transition-all duration-200 hover:shadow-md', statusColors[status], className)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">{title}</span>
          {icon && <div className="text-gray-400">{icon}</div>}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {trend && trendValue && (
            <div className="flex items-center gap-1">
              {trendIcons[trend]}
              <span className="text-xs text-gray-500">{trendValue}</span>
            </div>
          )}
        </div>

        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
};

// Chart component (simplified for demo)
interface SimpleChartProps {
  data: number[];
  title: string;
  color?: string;
}

const SimpleChart: React.FC<SimpleChartProps> = ({ data, title, color = '#3B82F6' }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">{title}</h4>
      <div className="flex items-end gap-1 h-20">
        {data.map((value, index) => {
          const height = ((value - min) / range) * 70 + 5;
          return (
            <div
              key={index}
              className="flex-1 rounded-t"
              style={{
                height: `${height}px`,
                backgroundColor: color,
                opacity: 0.8,
              }}
              title={`${value.toFixed(1)}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min.toFixed(0)}</span>
        <span>{max.toFixed(0)}</span>
      </div>
    </div>
  );
};

// A/B Testing performance component
const ABTestingResults: React.FC<{ data: PerformanceMetrics['colorVariantPerformance'] }> = ({
  data,
}) => {
  const variants = Object.entries(data)
    .map(([variant, metrics]) => ({
      variant,
      conversionRate: metrics.conversions / metrics.views,
      revenuePerUser: metrics.revenue / metrics.views,
      ...metrics,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          A/B Testing Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {variants.map(
            ({ variant, conversionRate, revenuePerUser, conversions, views, revenue }) => (
              <div
                key={variant}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium capitalize">{variant.replace('_', ' ')}</div>
                  <div className="text-sm text-gray-600">
                    {conversions} / {views} conversions
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{(conversionRate * 100).toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">${revenuePerUser.toFixed(2)}/user</div>
                </div>
              </div>
            ),
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Main monitoring dashboard
export const UnifiedMonitoringDashboard: React.FC = () => {
  const { colors } = useQuoteTheme();
  const [metrics, setMetrics] = useState<PerformanceMetrics>(generateMockMetrics());
  const [isLive, setIsLive] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setMetrics(generateMockMetrics());
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive]);

  // Calculate derived metrics
  const derivedMetrics = useMemo(() => {
    const avgPageLoad = calculateAverage(metrics.pageLoadTimes);
    const p95PageLoad = calculatePercentile(metrics.pageLoadTimes, 95);
    const avgSearchTime = calculateAverage(metrics.searchResponseTimes);

    const componentHealth = Object.entries(metrics.componentRenderTimes).map(([name, times]) => ({
      name,
      avgTime: calculateAverage(times),
      p95Time: calculatePercentile(times, 95),
      errorRate: metrics.componentErrorRates[name] || 0,
      trend: calculateTrend(times),
    }));

    const overallHealth = componentHealth.every((c) => c.errorRate < 0.05 && c.avgTime < 200)
      ? 'good'
      : componentHealth.some((c) => c.errorRate > 0.1 || c.avgTime > 500)
        ? 'critical'
        : 'warning';

    return {
      avgPageLoad,
      p95PageLoad,
      avgSearchTime,
      componentHealth,
      overallHealth,
    };
  }, [metrics]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600">Unified Quote System Performance Dashboard</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', isLive ? 'bg-green-500' : 'bg-gray-400')} />
            <span className="text-sm text-gray-600">{isLive ? 'Live' : 'Paused'}</span>
          </div>

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <Button variant="outline" size="sm" onClick={() => setIsLive(!isLive)}>
            {isLive ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
          </Button>

          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="System Health"
          value={
            derivedMetrics.overallHealth === 'good'
              ? '✅ Healthy'
              : derivedMetrics.overallHealth === 'warning'
                ? '⚠️ Warning'
                : '🚨 Critical'
          }
          subtitle="Overall system status"
          icon={<Activity className="h-4 w-4" />}
          status={derivedMetrics.overallHealth}
        />

        <MetricCard
          title="Page Load Time"
          value={`${derivedMetrics.avgPageLoad.toFixed(0)}ms`}
          subtitle={`P95: ${derivedMetrics.p95PageLoad.toFixed(0)}ms`}
          trend={calculateTrend(metrics.pageLoadTimes)}
          trendValue="vs last period"
          icon={<Clock className="h-4 w-4" />}
          status={
            derivedMetrics.avgPageLoad > 2000
              ? 'critical'
              : derivedMetrics.avgPageLoad > 1500
                ? 'warning'
                : 'good'
          }
        />

        <MetricCard
          title="Quote Approval Rate"
          value={`${(metrics.conversionRates.quoteApproval * 100).toFixed(1)}%`}
          subtitle="Customer quote approvals"
          icon={<CheckCircle className="h-4 w-4" />}
          status={metrics.conversionRates.quoteApproval > 0.3 ? 'good' : 'warning'}
        />

        <MetricCard
          title="Cache Hit Rate"
          value={`${(metrics.cacheHitRates.QuoteListCache * 100).toFixed(1)}%`}
          subtitle="Quote list cache performance"
          icon={<Database className="h-4 w-4" />}
          status={metrics.cacheHitRates.QuoteListCache > 0.8 ? 'good' : 'warning'}
        />
      </div>

      {/* Component Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Component Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {derivedMetrics.componentHealth.map((component) => (
              <div
                key={component.name}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-3 h-3 rounded-full',
                      component.errorRate > 0.05
                        ? 'bg-red-500'
                        : component.avgTime > 200
                          ? 'bg-yellow-500'
                          : 'bg-green-500',
                    )}
                  />
                  <span className="font-medium">{component.name}</span>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-600">Avg: </span>
                    <span className="font-medium">{component.avgTime.toFixed(0)}ms</span>
                  </div>
                  <div>
                    <span className="text-gray-600">P95: </span>
                    <span className="font-medium">{component.p95Time.toFixed(0)}ms</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Errors: </span>
                    <span className="font-medium">{(component.errorRate * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {component.trend === 'up' && <TrendingUp className="h-3 w-3 text-red-500" />}
                    {component.trend === 'down' && (
                      <TrendingDown className="h-3 w-3 text-green-500" />
                    )}
                    {component.trend === 'stable' && (
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Charts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <SimpleChart
              data={metrics.pageLoadTimes}
              title="Page Load Times (ms)"
              color="#3B82F6"
            />
            <SimpleChart
              data={metrics.searchResponseTimes}
              title="Search Response Times (ms)"
              color="#10B981"
            />
          </CardContent>
        </Card>

        {/* A/B Testing Results */}
        <ABTestingResults data={metrics.colorVariantPerformance} />
      </div>

      {/* Business Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Add to Cart Rate"
          value={`${(metrics.conversionRates.addToCart * 100).toFixed(1)}%`}
          subtitle="Quote to cart conversion"
          icon={<ShoppingCart className="h-4 w-4" />}
          status={metrics.conversionRates.addToCart > 0.5 ? 'good' : 'warning'}
        />

        <MetricCard
          title="Checkout Rate"
          value={`${(metrics.conversionRates.checkout * 100).toFixed(1)}%`}
          subtitle="Cart to purchase conversion"
          icon={<DollarSign className="h-4 w-4" />}
          status={metrics.conversionRates.checkout > 0.2 ? 'good' : 'warning'}
        />

        <MetricCard
          title="PWA Install Rate"
          value={`${(metrics.pwinstallRate * 100).toFixed(1)}%`}
          subtitle="Progressive Web App installs"
          icon={<Smartphone className="h-4 w-4" />}
          status={metrics.pwinstallRate > 0.1 ? 'good' : 'warning'}
        />
      </div>

      {/* Device & Browser Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Device Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.deviceBreakdown).map(([device, percentage]) => (
                <div key={device} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {device === 'mobile' && <Smartphone className="h-4 w-4" />}
                    {device === 'desktop' && <Monitor className="h-4 w-4" />}
                    {device === 'tablet' && <Monitor className="h-4 w-4" />}
                    <span className="capitalize">{device}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(percentage * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Browser Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.browserBreakdown).map(([browser, percentage]) => (
                <div key={browser} className="flex items-center justify-between">
                  <span className="capitalize">{browser}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(percentage * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            API Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(metrics.apiResponseTimes).map(([endpoint, times]) => (
              <div key={endpoint} className="space-y-2">
                <h4 className="font-medium capitalize">{endpoint} API</h4>
                <div className="text-2xl font-bold">{calculateAverage(times).toFixed(0)}ms</div>
                <div className="text-sm text-gray-600">
                  P95: {calculatePercentile(times, 95).toFixed(0)}ms
                </div>
                <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      calculateAverage(times) < 200
                        ? 'bg-green-500'
                        : calculateAverage(times) < 500
                          ? 'bg-yellow-500'
                          : 'bg-red-500',
                    )}
                    style={{ width: `${Math.min(calculateAverage(times) / 10, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnifiedMonitoringDashboard;
