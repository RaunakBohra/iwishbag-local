import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";
import { startOfWeek, format } from "date-fns";

export const VolumeTrend = () => {
  const { data: quotes, isLoading, error } = useQuery({
    queryKey: ['volume-trend'],
    queryFn: async () => {
      // Get last 8 weeks of data
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56); // 8 weeks * 7 days
      
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('created_at, status')
        .gte('created_at', eightWeeksAgo.toISOString())
        .in('status', ['paid', 'ordered', 'shipped', 'completed'])
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return quotes;
    },
  });

  const result = useMemo(() => {
    if (!quotes) return { trend: 'stable', percentage: 0, weeklyData: [] };

    // Group by week and count quotes
    const weeklyData = quotes.reduce((acc: any[], quote) => {
      const weekStart = startOfWeek(new Date(quote.created_at), { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      const existingWeek = acc.find(w => w.week === weekKey);
      if (existingWeek) {
        existingWeek.count += 1;
      } else {
        acc.push({
          week: weekKey,
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

    const recentAvg = recentWeeks.reduce((sum, week) => sum + week.count, 0) / recentWeeks.length;
    const olderAvg = olderWeeks.reduce((sum, week) => sum + week.count, 0) / olderWeeks.length;

    const percentage = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    const trend = percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable';

    return { trend, percentage: Math.abs(percentage), weeklyData };
  }, [quotes]);

  const getTrendIcon = (change: number) => {
    if (isNaN(change)) return <Minus className="h-4 w-4 text-gray-500" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (change: number) => {
    if (isNaN(change)) return "text-gray-500";
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-gray-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Volume Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Volume Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading volume data</p>
        </CardContent>
      </Card>
    );
  }

  const hasData = result.weeklyData && result.weeklyData.length > 0;
  const showTrend = result.weeklyData.length >= 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Volume Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Quotes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Quotes</span>
              {getTrendIcon(result.percentage || 0)}
            </div>
            <div className="text-2xl font-bold">
              {result.weeklyData.length}
            </div>
            {showTrend ? (
              <p className={`text-sm ${getTrendColor(result.percentage || 0)}`}>
                {result.percentage > 0 ? '+' : ''}{result.percentage}% vs previous week
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {result.weeklyData.length === 1 ? 'First week of data' : 'Insufficient data for trend'}
              </p>
            )}
          </div>

          {/* Simple chart */}
          <div className="mt-4 space-y-2">
            <div className="text-xs text-muted-foreground">Weekly Volume</div>
            {hasData ? (
              <div className="flex items-end space-x-1 h-16">
                {result.weeklyData.slice(-6).map((week) => {
                  const maxVolume = Math.max(...result.weeklyData.map(w => Math.max(w.count)));
                  const quoteHeight = maxVolume > 0 ? (week.count / maxVolume) * 100 : 0;
                  
                  return (
                    <div key={week.week} className="flex-1 flex flex-col items-center space-y-1">
                      <div className="w-full flex flex-col space-y-1">
                        <div 
                          className="w-full bg-blue-500 rounded-t min-h-[2px]"
                          style={{ height: `${quoteHeight}%` }}
                          title={`${week.count} quotes`}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(week.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
                No volume data available
              </div>
            )}
            <div className="flex items-center justify-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Quotes</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 