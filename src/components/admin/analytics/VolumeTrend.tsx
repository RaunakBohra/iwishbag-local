import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const VolumeTrend = () => {
  const { data: volumeData, isLoading } = useQuery({
    queryKey: ['volume-trend'],
    queryFn: async () => {
      // Get last 8 weeks of data
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56); // 8 weeks * 7 days
      
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('created_at, approval_status')
        .gte('created_at', eightWeeksAgo.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;

      // Group by week
      const weeklyQuotes = new Map();
      const weeklyOrders = new Map();

      quotes?.forEach(quote => {
        const date = new Date(quote.created_at);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        // Count quotes
        const currentQuotes = weeklyQuotes.get(weekKey) || 0;
        weeklyQuotes.set(weekKey, currentQuotes + 1);
        
        // Count orders (approved quotes)
        if (quote.approval_status === 'approved') {
          const currentOrders = weeklyOrders.get(weekKey) || 0;
          weeklyOrders.set(weekKey, currentOrders + 1);
        }
      });

      // Convert to arrays and sort
      const weeks = Array.from(new Set([...weeklyQuotes.keys(), ...weeklyOrders.keys()])).sort();
      
      const weeklyData = weeks.map(week => ({
        week,
        quotes: weeklyQuotes.get(week) || 0,
        orders: weeklyOrders.get(week) || 0
      }));

      // Calculate totals
      const totalQuotes = quotes?.length || 0;
      const totalOrders = quotes?.filter(q => q.approval_status === 'approved').length || 0;

      // Calculate trends
      const recentWeeks = weeklyData.slice(-4);
      const previousWeeks = weeklyData.slice(-8, -4);
      
      const recentQuoteAvg = recentWeeks.reduce((sum, week) => sum + week.quotes, 0) / recentWeeks.length;
      const previousQuoteAvg = previousWeeks.reduce((sum, week) => sum + week.quotes, 0) / previousWeeks.length;
      
      const recentOrderAvg = recentWeeks.reduce((sum, week) => sum + week.orders, 0) / recentWeeks.length;
      const previousOrderAvg = previousWeeks.reduce((sum, week) => sum + week.orders, 0) / previousWeeks.length;
      
      const quoteChange = recentQuoteAvg - previousQuoteAvg;
      const orderChange = recentOrderAvg - previousOrderAvg;
      
      const quoteChangePercent = previousQuoteAvg > 0 ? (quoteChange / previousQuoteAvg) * 100 : 0;
      const orderChangePercent = previousOrderAvg > 0 ? (orderChange / previousOrderAvg) * 100 : 0;

      return {
        totalQuotes,
        totalOrders,
        weeklyData,
        quoteChange: Math.round(quoteChange * 100) / 100,
        orderChange: Math.round(orderChange * 100) / 100,
        quoteChangePercent: Math.round(quoteChangePercent * 100) / 100,
        orderChangePercent: Math.round(orderChangePercent * 100) / 100
      };
    },
  });

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (change: number) => {
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
              {getTrendIcon(volumeData?.quoteChange || 0)}
            </div>
            <div className="text-2xl font-bold">
              {volumeData?.totalQuotes || 0}
            </div>
            <p className={`text-sm ${getTrendColor(volumeData?.quoteChange || 0)}`}>
              {volumeData?.quoteChange > 0 ? '+' : ''}{volumeData?.quoteChangePercent || 0}% vs previous 4 weeks
            </p>
          </div>

          {/* Orders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Orders</span>
              {getTrendIcon(volumeData?.orderChange || 0)}
            </div>
            <div className="text-2xl font-bold">
              {volumeData?.totalOrders || 0}
            </div>
            <p className={`text-sm ${getTrendColor(volumeData?.orderChange || 0)}`}>
              {volumeData?.orderChange > 0 ? '+' : ''}{volumeData?.orderChangePercent || 0}% vs previous 4 weeks
            </p>
          </div>

          {/* Simple chart */}
          <div className="mt-4 space-y-2">
            <div className="text-xs text-muted-foreground">Weekly Volume</div>
            <div className="flex items-end space-x-1 h-16">
              {volumeData?.weeklyData.slice(-6).map((week) => {
                const maxVolume = Math.max(...volumeData.weeklyData.map(w => Math.max(w.quotes, w.orders)));
                const quoteHeight = maxVolume > 0 ? (week.quotes / maxVolume) * 100 : 0;
                const orderHeight = maxVolume > 0 ? (week.orders / maxVolume) * 100 : 0;
                
                return (
                  <div key={week.week} className="flex-1 flex flex-col items-center space-y-1">
                    <div className="w-full flex flex-col space-y-1">
                      <div 
                        className="w-full bg-blue-500 rounded-t"
                        style={{ height: `${quoteHeight}%` }}
                        title={`${week.quotes} quotes`}
                      />
                      <div 
                        className="w-full bg-green-500 rounded-t"
                        style={{ height: `${orderHeight}%` }}
                        title={`${week.orders} orders`}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(week.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Quotes</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Orders</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 