import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, Calendar, TrendingUp, Users, Target, RefreshCw } from 'lucide-react';
import { format, startOfWeek, startOfMonth, subDays, subWeeks, subMonths } from 'date-fns';

interface UsageAnalytics {
  period: string;
  total_usage: number;
  unique_users: number;
  total_savings: number;
  avg_discount_value: number;
  top_campaigns: Array<{
    id: string;
    name: string;
    usage_count: number;
    total_savings: number;
  }>;
  usage_by_country: Array<{
    country_code: string;
    country_name: string;
    usage_count: number;
    total_savings: number;
  }>;
  daily_usage: Array<{
    date: string;
    usage_count: number;
    savings: number;
  }>;
}

interface UsageAnalyticsSectionProps {
  analytics: UsageAnalytics | null;
  loading: boolean;
  onRefresh: () => void;
  onPeriodChange: (period: string) => void;
}

export const UsageAnalyticsSection: React.FC<UsageAnalyticsSectionProps> = ({
  analytics,
  loading,
  onRefresh,
  onPeriodChange
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [exportLoading, setExportLoading] = useState(false);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    onPeriodChange(period);
  };

  const exportAnalytics = async () => {
    if (!analytics) return;
    
    setExportLoading(true);
    try {
      // Create CSV content
      const csvContent = [
        ['Metric', 'Value'],
        ['Period', analytics.period],
        ['Total Usage', analytics.total_usage.toString()],
        ['Unique Users', analytics.unique_users.toString()],
        ['Total Savings', `$${analytics.total_savings.toLocaleString()}`],
        ['Average Discount Value', `$${analytics.avg_discount_value.toFixed(2)}`],
        [''],
        ['Top Campaigns'],
        ['Campaign Name', 'Usage Count', 'Total Savings'],
        ...analytics.top_campaigns.map(c => [c.name, c.usage_count.toString(), `$${c.total_savings.toLocaleString()}`]),
        [''],
        ['Usage by Country'],
        ['Country', 'Usage Count', 'Total Savings'],
        ...analytics.usage_by_country.map(c => [c.country_name, c.usage_count.toString(), `$${c.total_savings.toLocaleString()}`])
      ].map(row => row.join(',')).join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `discount-analytics-${selectedPeriod}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 3 Months';
      case '1y': return 'Last Year';
      default: return 'Last 30 Days';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className="p-8 text-center">
        <div className="text-gray-500">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No analytics data</h3>
          <p className="text-sm">
            Usage analytics will appear here once discount campaigns have activity.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Usage Analytics & Reporting</h3>
          <p className="text-sm text-gray-600">
            Comprehensive discount usage insights and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 3 Months</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={exportAnalytics} disabled={exportLoading}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key metrics overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_usage.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Discount applications in {getPeriodLabel(selectedPeriod).toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.unique_users.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Customers who used discounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.total_savings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Customer savings generated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Discount</CardTitle>
            <BarChart3 className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.avg_discount_value.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Average discount amount
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top performing campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Campaigns</CardTitle>
          <CardDescription>
            Campaigns with highest usage and customer savings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.top_campaigns.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No campaign data for selected period</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.top_campaigns.map((campaign, index) => (
                <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center font-mono">
                      {index + 1}
                    </Badge>
                    <div>
                      <h4 className="font-medium">{campaign.name}</h4>
                      <p className="text-sm text-gray-500">
                        {campaign.usage_count} uses • ${campaign.total_savings.toLocaleString()} saved
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">${campaign.total_savings.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">{campaign.usage_count} applications</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage by country */}
      <Card>
        <CardHeader>
          <CardTitle>Usage by Country</CardTitle>
          <CardDescription>
            Geographic distribution of discount usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.usage_by_country.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No geographic data for selected period</p>
            </div>
          ) : (
            <div className="space-y-2">
              {analytics.usage_by_country.map((country) => (
                <div key={country.country_code} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {country.country_code}
                    </Badge>
                    <span>{country.country_name}</span>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">{country.usage_count} uses</div>
                    <div className="text-gray-500">${country.total_savings.toLocaleString()} saved</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily usage trend */}
      {analytics.daily_usage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Usage Trend</CardTitle>
            <CardDescription>
              Discount usage over time for {getPeriodLabel(selectedPeriod).toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.daily_usage.slice(-7).map((day) => (
                <div key={day.date} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>{format(new Date(day.date), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">{day.usage_count} uses</div>
                    <div className="text-gray-500">${day.savings.toLocaleString()} saved</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};