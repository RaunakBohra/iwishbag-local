import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Zap,
  DollarSign,
  Package,
  Globe,
  Users,
  RefreshCw,
  Calendar,
  Activity,
  AlertTriangle
} from 'lucide-react';

export const AnalyticsTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState({
    overview: {
      totalQuotes: 0,
      successRate: 0,
      averageConfidence: 0,
      totalRevenue: 0
    },
    trends: {
      dailyQuotes: [],
      successRates: [],
      confidenceScores: []
    },
    performance: {
      topWebsites: [],
      topCategories: [],
      averageProcessingTime: 0
    },
    errors: {
      commonErrors: [],
      failedScrapes: 0,
      timeoutErrors: 0
    }
  });

  // Mock data for demonstration
  useEffect(() => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setAnalytics({
        overview: {
          totalQuotes: 1247,
          successRate: 87.3,
          averageConfidence: 0.82,
          totalRevenue: 45678.90
        },
        trends: {
          dailyQuotes: [
            { date: '2024-01-01', count: 45, success: 39 },
            { date: '2024-01-02', count: 52, success: 46 },
            { date: '2024-01-03', count: 38, success: 33 },
            { date: '2024-01-04', count: 61, success: 54 },
            { date: '2024-01-05', count: 49, success: 43 },
            { date: '2024-01-06', count: 67, success: 59 },
            { date: '2024-01-07', count: 58, success: 51 }
          ],
          successRates: [
            { date: '2024-01-01', rate: 86.7 },
            { date: '2024-01-02', rate: 88.5 },
            { date: '2024-01-03', rate: 86.8 },
            { date: '2024-01-04', rate: 88.5 },
            { date: '2024-01-05', rate: 87.8 },
            { date: '2024-01-06', rate: 88.1 },
            { date: '2024-01-07', rate: 87.9 }
          ],
          confidenceScores: [
            { date: '2024-01-01', score: 0.79 },
            { date: '2024-01-02', score: 0.83 },
            { date: '2024-01-03', score: 0.81 },
            { date: '2024-01-04', score: 0.85 },
            { date: '2024-01-05', score: 0.82 },
            { date: '2024-01-06', score: 0.84 },
            { date: '2024-01-07', score: 0.83 }
          ]
        },
        performance: {
          topWebsites: [
            { domain: 'amazon.com', quotes: 456, successRate: 92.1 },
            { domain: 'ebay.com', quotes: 234, successRate: 85.3 },
            { domain: 'walmart.com', quotes: 189, successRate: 78.9 },
            { domain: 'target.com', quotes: 156, successRate: 81.2 },
            { domain: 'bestbuy.com', quotes: 123, successRate: 89.4 }
          ],
          topCategories: [
            { category: 'Electronics', quotes: 567, avgPrice: 89.45 },
            { category: 'Clothing', quotes: 234, avgPrice: 34.12 },
            { category: 'Books', quotes: 189, avgPrice: 15.67 },
            { category: 'Home & Garden', quotes: 156, avgPrice: 67.89 },
            { category: 'Sports', quotes: 123, avgPrice: 45.23 }
          ],
          averageProcessingTime: 2.3
        },
        errors: {
          commonErrors: [
            { error: 'Product not found', count: 45, percentage: 12.3 },
            { error: 'Price extraction failed', count: 32, percentage: 8.7 },
            { error: 'Image URL invalid', count: 28, percentage: 7.6 },
            { error: 'Weight estimation failed', count: 23, percentage: 6.3 },
            { error: 'Category classification failed', count: 19, percentage: 5.2 }
          ],
          failedScrapes: 156,
          timeoutErrors: 23
        }
      });
      setIsLoading(false);
    }, 1000);
  }, [timeRange]);

  const refreshData = () => {
    setIsLoading(true);
    // Simulate refresh
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Auto Quote Analytics</h2>
          <p className="text-muted-foreground">
            Performance metrics and insights for the auto quote system
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Quotes</p>
                <p className="text-2xl font-bold">{analytics.overview.totalQuotes.toLocaleString()}</p>
              </div>
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-green-600">+12.5%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{analytics.overview.successRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-green-600">+2.1%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">{(analytics.overview.averageConfidence * 100).toFixed(1)}%</p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-green-600">+1.8%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${analytics.overview.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-green-600">+8.3%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="websites">Websites</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Processing Time
                </CardTitle>
                <CardDescription>
                  Average time to generate auto quotes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">
                    {analytics.performance.averageProcessingTime}s
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Average processing time per quote
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Daily Trends
                </CardTitle>
                <CardDescription>
                  Quote volume over the last 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analytics.trends.dailyQuotes.slice(-7).map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{day.count}</span>
                        <Badge variant="outline" className="text-xs">
                          {((day.success / day.count) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="websites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Top Websites
              </CardTitle>
              <CardDescription>
                Most successful websites for auto quotes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.performance.topWebsites.map((website, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{website.domain}</p>
                        <p className="text-sm text-muted-foreground">
                          {website.quotes} quotes generated
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">
                        {website.successRate}%
                      </p>
                      <p className="text-sm text-muted-foreground">Success rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Top Categories
              </CardTitle>
              <CardDescription>
                Most quoted product categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.performance.topCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{category.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {category.quotes} quotes generated
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-blue-600">
                        ${category.avgPrice}
                      </p>
                      <p className="text-sm text-muted-foreground">Avg price</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Common Errors
                </CardTitle>
                <CardDescription>
                  Most frequent error types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.errors.commonErrors.map((error, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{error.error}</p>
                        <p className="text-xs text-muted-foreground">
                          {error.count} occurrences
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {error.percentage}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Error Summary
                </CardTitle>
                <CardDescription>
                  Overall error statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Failed Scrapes</span>
                    <Badge variant="destructive">{analytics.errors.failedScrapes}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Timeout Errors</span>
                    <Badge variant="destructive">{analytics.errors.timeoutErrors}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Rate</span>
                    <Badge variant="outline">
                      {((analytics.errors.failedScrapes / analytics.overview.totalQuotes) * 100).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 