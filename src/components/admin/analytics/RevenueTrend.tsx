import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserCurrency } from "@/hooks/useUserCurrency";

export const RevenueTrend = () => {
  const { formatAmount } = useUserCurrency();
  
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['revenue-trend'],
    queryFn: async () => {
      // Get last 12 weeks of revenue data
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 weeks * 7 days
      
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('final_total_local, final_total, created_at, approval_status')
        .eq('approval_status', 'approved')
        .gte('created_at', twelveWeeksAgo.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Group by week
      const weeklyData = new Map();
      const totalRevenue = quotes?.reduce((sum, quote) => sum + (quote.final_total_local ?? quote.final_total ?? 0), 0) || 0;

      quotes?.forEach(quote => {
        const date = new Date(quote.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        const current = weeklyData.get(weekKey) || 0;
        weeklyData.set(weekKey, current + (quote.final_total_local ?? quote.final_total ?? 0));
      });

      // Convert to array and sort
      const weeklyArray = Array.from(weeklyData.entries())
        .map(([week, revenue]) => ({ week, revenue }))
        .sort((a, b) => a.week.localeCompare(b.week));

      // Calculate trend
      const recentWeeks = weeklyArray.slice(-4); // Last 4 weeks
      const previousWeeks = weeklyArray.slice(-8, -4); // Previous 4 weeks
      
      const recentAvg = recentWeeks.reduce((sum, week) => sum + week.revenue, 0) / recentWeeks.length;
      const previousAvg = previousWeeks.reduce((sum, week) => sum + week.revenue, 0) / previousWeeks.length;
      
      const change = recentAvg - previousAvg;
      const changePercent = previousAvg > 0 ? (change / previousAvg) * 100 : 0;

      return {
        totalRevenue,
        weeklyData: weeklyArray,
        change,
        changePercent: Math.round(changePercent * 100) / 100,
        recentAvg: Math.round(recentAvg * 100) / 100
      };
    },
  });

  const getTrendIcon = () => {
    if (!revenueData) return <Minus className="h-4 w-4 text-gray-500" />;
    if (revenueData.change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (revenueData.change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (!revenueData) return "text-gray-500";
    if (revenueData.change > 0) return "text-green-500";
    if (revenueData.change < 0) return "text-red-500";
    return "text-gray-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Revenue Trend
          {getTrendIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {formatAmount(revenueData?.totalRevenue || 0)}
        </div>
        <p className="text-sm text-muted-foreground">
          Total revenue (last 12 weeks)
        </p>
        <p className={`text-sm ${getTrendColor()}`}>
          {revenueData?.change > 0 ? '+' : ''}{revenueData?.changePercent || 0}% vs previous 4 weeks
        </p>
        
        {/* Simple bar chart */}
        <div className="mt-4 space-y-2">
          <div className="text-xs text-muted-foreground">Weekly Revenue</div>
          <div className="flex items-end space-x-1 h-16">
            {revenueData?.weeklyData.slice(-8).map((week, index) => {
              const maxRevenue = Math.max(...revenueData.weeklyData.map(w => w.revenue));
              const height = maxRevenue > 0 ? (week.revenue / maxRevenue) * 100 : 0;
              
              return (
                <div key={week.week} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatAmount(week.revenue)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 