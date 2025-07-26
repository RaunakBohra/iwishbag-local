import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  TrendingUp,
  AlertTriangle,
  Search,
  BarChart3,
  FileText,
  RefreshCw,
  ChevronRight,
  Database,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

interface HSNMetrics {
  totalCodes: number;
  codesWithMinValuations: number;
  recentlyUpdated: number;
  pendingReview: number;
  averageAccuracy: number;
  popularCategories: Array<{
    category: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

export function HSNManagementQuickAction() {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch HSN system metrics
  const { data: metrics, isLoading } = useQuery<HSNMetrics>({
    queryKey: ['hsn-metrics'],
    queryFn: async () => {
      // Mock data - in production this would come from your HSN analytics service
      return {
        totalCodes: 1247,
        codesWithMinValuations: 1156,
        recentlyUpdated: 23,
        pendingReview: 15,
        averageAccuracy: 94.2,
        popularCategories: [
          { category: 'Electronics', count: 342, trend: 'up' as const },
          { category: 'Textiles', count: 298, trend: 'stable' as const },
          { category: 'Machinery', count: 187, trend: 'up' as const },
          { category: 'Chemicals', count: 156, trend: 'down' as const },
          { category: 'Food Products', count: 134, trend: 'stable' as const },
        ],
      };
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">HSN Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const completionRate = (metrics.codesWithMinValuations / metrics.totalCodes) * 100;
  const hasIssues = metrics.pendingReview > 0 || metrics.averageAccuracy < 95;

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">HSN Management</CardTitle>
            {hasIssues && (
              <Badge variant="destructive" className="text-xs">
                {metrics.pendingReview} Pending
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          </Button>
        </div>
        <CardDescription className="text-blue-700">
          Harmonized System tax classification management
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/60 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-900">{metrics.totalCodes}</div>
            <div className="text-xs text-blue-700 font-medium">Total HSN Codes</div>
          </div>
          <div className="bg-white/60 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{metrics.averageAccuracy}%</div>
            <div className="text-xs text-blue-700 font-medium">Classification Accuracy</div>
          </div>
        </div>

        {/* Completion Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-800 font-medium">Minimum Valuations</span>
            <span className="text-blue-600">{Math.round(completionRate)}%</span>
          </div>
          <Progress value={completionRate} className="h-2 bg-blue-100" />
          <div className="text-xs text-blue-600">
            {metrics.codesWithMinValuations} of {metrics.totalCodes} codes configured
          </div>
        </div>

        {/* Status Alerts */}
        {hasIssues && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Attention Required</span>
            </div>
            <div className="text-xs text-amber-700">
              {metrics.pendingReview} codes need review, accuracy below target
            </div>
          </div>
        )}

        {/* Expanded View */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t border-blue-200">
            {/* Popular Categories */}
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-2">Top Categories</h4>
              <div className="space-y-2">
                {metrics.popularCategories.slice(0, 3).map((category) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <span className="text-sm text-blue-800">{category.category}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-blue-600">{category.count}</span>
                      <TrendingUp
                        className={`h-3 w-3 ${
                          category.trend === 'up'
                            ? 'text-green-500'
                            : category.trend === 'down'
                              ? 'text-red-500'
                              : 'text-gray-400'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-sm font-medium text-blue-900 mb-2">Recent Activity</h4>
              <div className="text-xs text-blue-700">
                {metrics.recentlyUpdated} codes updated in the last 24 hours
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/60 border-blue-200 text-blue-700 hover:bg-blue-100"
            onClick={() => navigate('/admin/hsn-management')}
          >
            <Settings className="h-4 w-4 mr-1" />
            Manage
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/60 border-blue-200 text-blue-700 hover:bg-blue-100"
            onClick={() => navigate('/admin/hsn-management/search')}
          >
            <Search className="h-4 w-4 mr-1" />
            Search
          </Button>
        </div>

        {/* Additional Actions - Only when expanded */}
        {isExpanded && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/60 border-blue-200 text-blue-700 hover:bg-blue-100"
              onClick={() => navigate('/admin/hsn-management/analytics')}
            >
              <BarChart3 className="h-4 w-4 mr-1" />
              Analytics
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white/60 border-blue-200 text-blue-700 hover:bg-blue-100"
              onClick={() => navigate('/admin/hsn-management/reports')}
            >
              <FileText className="h-4 w-4 mr-1" />
              Reports
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
