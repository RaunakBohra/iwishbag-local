import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { useMemo } from "react";
import { format, startOfWeek } from "date-fns";

export const RevenueTrend = () => {
  const { formatAmount } = useUserCurrency();
  
  const { data: quotes, isLoading, error } = useQuery({
    queryKey: ['revenue-trend'],
    queryFn: async () => {
      // Get last 12 weeks of revenue data
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 weeks * 7 days
      
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('final_total, created_at, status')
        .gte('created_at', twelveWeeksAgo.toISOString())
        .in('status', ['paid', 'ordered', 'shipped', 'completed'])
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return quotes;
    },
  });

  const result = useMemo(() => {
    if (!quotes) return { trend: 'stable', percentage: 0, weeklyData: [] };

    // Group by week and calculate revenue
    const weeklyData = quotes.reduce((acc: any[], quote) => {
      const weekStart = startOfWeek(new Date(quote.created_at), { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      const existingWeek = acc.find(w => w.week === weekKey);
      if (existingWeek) {
        existingWeek.revenue += quote.final_total || 0;
        existingWeek.count += 1;
      } else {
        acc.push({
          week: weekKey,
          revenue: quote.final_total || 0,
          count: 1
        });
      }
      return acc;
    }, []);

    // Sort by week
    weeklyData.sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

    // Calculate trend
    if (weeklyData.length < 2) {
      return { trend: 'stable', percentage: 0, weeklyData };
    }

    const recentWeeks = weeklyData.slice(-4); // Last 4 weeks
    const olderWeeks = weeklyData.slice(-8, -4); // Previous 4 weeks

    const recentAvg = recentWeeks.reduce((sum, week) => sum + week.revenue, 0) / recentWeeks.length;
    const olderAvg = olderWeeks.reduce((sum, week) => sum + week.revenue, 0) / olderWeeks.length;

    const percentage = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    const trend = percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable';

    return { trend, percentage: Math.abs(percentage), weeklyData };
  }, [quotes]);

  const getTrendIcon = () => {
    if (!result || isNaN(result.percentage)) return <Minus className="h-4 w-4 text-gray-500" />;
    if (result.percentage > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (result.percentage < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (!result || isNaN(result.percentage)) return "text-gray-500";
    if (result.percentage > 0) return "text-green-500";
    if (result.percentage < 0) return "text-red-500";
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading revenue data</p>
        </CardContent>
      </Card>
    );
  }

  const hasData = result?.weeklyData && result.weeklyData.length > 0;
  const showTrend = !isNaN(result?.percentage) && result?.weeklyData.length >= 2;

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
          {formatAmount(result?.totalRevenue || 0)}
        </div>
        <p className="text-sm text-muted-foreground">
          Total revenue (last 12 weeks)
        </p>
        {showTrend ? (
          <p className={`text-sm ${getTrendColor()}`}>
            {result?.percentage > 0 ? '+' : ''}{result?.percentage || 0}% vs previous week
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {result?.weeklyData.length === 1 ? 'First week of data' : 'Insufficient data for trend'}
          </p>
        )}
        
        {/* Simple bar chart */}
        <div className="mt-4 space-y-2">
          <div className="text-xs text-muted-foreground">Weekly Revenue</div>
          {hasData ? (
            <div className="flex items-end space-x-1 h-16">
              {result?.weeklyData.slice(-8).map((week, index) => {
                const maxRevenue = Math.max(...result.weeklyData.map(w => w.revenue));
                const height = maxRevenue > 0 ? (week.revenue / maxRevenue) * 100 : 0;
                
                return (
                  <div key={week.week} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t min-h-[2px]"
                      style={{ height: `${height}%` }}
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatAmount(week.revenue)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
              No revenue data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 