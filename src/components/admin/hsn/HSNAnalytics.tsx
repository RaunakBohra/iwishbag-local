/**
 * HSN Analytics Component
 * Displays analytics and insights for HSN-based tax system
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  Users,
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalQuotesProcessed: number;
    averageProcessingTime: number;
    classificationAccuracy: number;
    totalTaxCalculated: number;
  };
  classification: {
    successRate: number;
    topCategories: Array<{
      category: string;
      count: number;
      accuracy: number;
    }>;
    lowConfidenceItems: number;
  };
  weightDetection: {
    detectionRate: number;
    averageConfidence: number;
    topSources: Array<{
      source: string;
      count: number;
      accuracy: number;
    }>;
  };
  taxCalculation: {
    averageTaxRate: number;
    topRoutes: Array<{
      route: string;
      count: number;
      totalTax: number;
    }>;
    overrideUsage: number;
  };
  trends: {
    dailyStats: Array<{
      date: string;
      processed: number;
      successful: number;
      errors: number;
    }>;
  };
}

export const HSNAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        // Mock analytics data
        const mockAnalytics: AnalyticsData = {
          overview: {
            totalQuotesProcessed: 1247,
            averageProcessingTime: 2400,
            classificationAccuracy: 94.2,
            totalTaxCalculated: 45678.9,
          },
          classification: {
            successRate: 87.5,
            topCategories: [
              { category: 'electronics', count: 456, accuracy: 95.2 },
              { category: 'clothing', count: 342, accuracy: 91.8 },
              { category: 'books', count: 128, accuracy: 98.1 },
              { category: 'home_garden', count: 89, accuracy: 84.7 },
              { category: 'sports', count: 67, accuracy: 88.3 },
            ],
            lowConfidenceItems: 156,
          },
          weightDetection: {
            detectionRate: 78.3,
            averageConfidence: 0.82,
            topSources: [
              { source: 'specifications', count: 234, accuracy: 96.8 },
              { source: 'hsn_data', count: 189, accuracy: 87.4 },
              { source: 'category_average', count: 167, accuracy: 72.1 },
              { source: 'url_extraction', count: 45, accuracy: 68.9 },
            ],
          },
          taxCalculation: {
            averageTaxRate: 18.7,
            topRoutes: [
              { route: 'US → IN', count: 567, totalTax: 23456.78 },
              { route: 'CN → IN', count: 234, totalTax: 12345.67 },
              { route: 'US → NP', count: 178, totalTax: 8901.23 },
              { route: 'IN → NP', count: 134, totalTax: 4567.89 },
            ],
            overrideUsage: 12.4,
          },
          trends: {
            dailyStats: [
              { date: '2025-01-17', processed: 189, successful: 176, errors: 13 },
              { date: '2025-01-18', processed: 234, successful: 221, errors: 13 },
              { date: '2025-01-19', processed: 167, successful: 158, errors: 9 },
              { date: '2025-01-20', processed: 201, successful: 189, errors: 12 },
              { date: '2025-01-21', processed: 156, successful: 147, errors: 9 },
              { date: '2025-01-22', processed: 178, successful: 165, errors: 13 },
              { date: '2025-01-23', processed: 122, successful: 115, errors: 7 },
            ],
          },
        };

        setAnalytics(mockAnalytics);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [timeRange]);

  const getSuccessRate = (successful: number, total: number) => {
    return total > 0 ? ((successful / total) * 100).toFixed(1) : '0.0';
  };

  const getTrendIcon = (value: number, threshold: number = 0) => {
    if (value > threshold) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No analytics data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">HSN System Analytics</h2>
          <p className="text-gray-600">Performance insights and system metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Quotes Processed</p>
                <p className="text-2xl font-bold">
                  {analytics.overview.totalQuotesProcessed.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  {getTrendIcon(12.5)}
                  +12.5% from last period
                </p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Processing Time</p>
                <p className="text-2xl font-bold">{analytics.overview.averageProcessingTime}ms</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <TrendingDown className="h-4 w-4 text-green-600" />
                  -8.3% faster
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Classification Accuracy</p>
                <p className="text-2xl font-bold">{analytics.overview.classificationAccuracy}%</p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  {getTrendIcon(2.1)}
                  +2.1% improvement
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tax Calculated</p>
                <p className="text-2xl font-bold">
                  ${analytics.overview.totalTaxCalculated.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  {getTrendIcon(18.7)}
                  +18.7% increase
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classification Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Classification Performance
            </CardTitle>
            <CardDescription>Product classification accuracy by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Overall Success Rate</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  {analytics.classification.successRate}%
                </Badge>
              </div>

              {analytics.classification.topCategories.map((category) => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm capitalize">
                      {category.category.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{category.count} items</span>
                      <span className="text-sm font-medium">{category.accuracy}%</span>
                    </div>
                  </div>
                  <Progress value={category.accuracy} className="h-2" />
                </div>
              ))}

              {analytics.classification.lowConfidenceItems > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      {analytics.classification.lowConfidenceItems} items need review
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Weight Detection Performance
            </CardTitle>
            <CardDescription>Weight detection accuracy by source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Detection Rate</span>
                <Badge variant="default" className="bg-blue-100 text-blue-800">
                  {analytics.weightDetection.detectionRate}%
                </Badge>
              </div>

              {analytics.weightDetection.topSources.map((source) => (
                <div key={source.source} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm capitalize">{source.source.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{source.count} items</span>
                      <span className="text-sm font-medium">{source.accuracy}%</span>
                    </div>
                  </div>
                  <Progress value={source.accuracy} className="h-2" />
                </div>
              ))}

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Average confidence:{' '}
                    {(analytics.weightDetection.averageConfidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Calculation Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Tax Calculation Insights
            </CardTitle>
            <CardDescription>Top routes by tax volume and quote count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Average Tax Rate</span>
                <Badge variant="outline">{analytics.taxCalculation.averageTaxRate}%</Badge>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead className="text-right">Quotes</TableHead>
                    <TableHead className="text-right">Total Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.taxCalculation.topRoutes.map((route) => (
                    <TableRow key={route.route}>
                      <TableCell className="font-mono text-sm">{route.route}</TableCell>
                      <TableCell className="text-right">{route.count}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${route.totalTax.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">
                    Admin overrides used in {analytics.taxCalculation.overrideUsage}% of
                    calculations
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Processing Trends
            </CardTitle>
            <CardDescription>Daily processing statistics for the last week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.trends.dailyStats.map((day) => (
                <div key={day.date} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-600">{day.successful} successful</span>
                      <span className="text-red-600">{day.errors} errors</span>
                      <span className="font-medium">{day.processed} total</span>
                    </div>
                  </div>
                  <Progress
                    value={day.processed > 0 ? (day.successful / day.processed) * 100 : 0}
                    className="h-2"
                  />
                  <div className="text-xs text-gray-500">
                    Success rate: {getSuccessRate(day.successful, day.processed)}%
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-green-600">
                    {analytics.trends.dailyStats.reduce((acc, day) => acc + day.successful, 0)}
                  </p>
                  <p className="text-xs text-gray-600">Total Successful</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">
                    {analytics.trends.dailyStats.reduce((acc, day) => acc + day.errors, 0)}
                  </p>
                  <p className="text-xs text-gray-600">Total Errors</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-blue-600">
                    {getSuccessRate(
                      analytics.trends.dailyStats.reduce((acc, day) => acc + day.successful, 0),
                      analytics.trends.dailyStats.reduce((acc, day) => acc + day.processed, 0),
                    )}
                    %
                  </p>
                  <p className="text-xs text-gray-600">Weekly Success Rate</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
