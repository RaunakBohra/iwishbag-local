import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserCurrency } from "@/hooks/useUserCurrency";

export const AverageOrderValue = () => {
  const { formatAmount } = useUserCurrency();
  
  const { data: aovData, isLoading } = useQuery({
    queryKey: ['average-order-value'],
    queryFn: async () => {
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('final_total_local, final_total, created_at, approval_status, country_code')
        .eq('approval_status', 'approved');
      if (error) throw error;
      const totalRevenue = quotes?.reduce((sum, quote) => sum + (quote.final_total_local ?? quote.final_total ?? 0), 0) || 0;
      const totalOrders = quotes?.length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentQuotes = quotes?.filter(q => new Date(q.created_at) >= thirtyDaysAgo) || [];
      const previousQuotes = quotes?.filter(q => new Date(q.created_at) < thirtyDaysAgo) || [];
      const recentRevenue = recentQuotes.reduce((sum, quote) => sum + (quote.final_total_local ?? quote.final_total ?? 0), 0);
      const recentOrders = recentQuotes.length;
      const recentAOV = recentOrders > 0 ? recentRevenue / recentOrders : 0;
      const previousRevenue = previousQuotes.reduce((sum, quote) => sum + (quote.final_total_local ?? quote.final_total ?? 0), 0);
      const previousOrders = previousQuotes.length;
      const previousAOV = previousOrders > 0 ? previousRevenue / previousOrders : 0;
      const change = recentAOV - previousAOV;
      const changePercent = previousAOV > 0 ? (change / previousAOV) * 100 : 0;
      const countryAOV = new Map();
      quotes?.forEach(quote => {
        const country = quote.country_code || 'Unknown';
        const current = countryAOV.get(country) || { revenue: 0, orders: 0 };
        countryAOV.set(country, {
          revenue: current.revenue + (quote.final_total_local ?? quote.final_total ?? 0),
          orders: current.orders + 1
        });
      });
      const topCountries = Array.from(countryAOV.entries())
        .map(([country, stats]) => ({
          country,
          aov: stats.orders > 0 ? stats.revenue / stats.orders : 0,
          orders: stats.orders
        }))
        .sort((a, b) => b.aov - a.aov)
        .slice(0, 3);
      return {
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        totalRevenue,
        totalOrders,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        recentAOV: Math.round(recentAOV * 100) / 100,
        previousAOV: Math.round(previousAOV * 100) / 100,
        topCountries
      };
    },
  });

  const getTrendIcon = () => {
    if (!aovData) return <Minus className="h-4 w-4 text-gray-500" />;
    if (aovData.change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (aovData.change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (!aovData) return "text-gray-500";
    if (aovData.change > 0) return "text-green-500";
    if (aovData.change < 0) return "text-red-500";
    return "text-gray-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Average Order Value</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Average Order Value
          </div>
          {getTrendIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {formatAmount(aovData?.averageOrderValue || 0)}
        </div>
        <p className="text-sm text-muted-foreground">
          Based on {aovData?.totalOrders || 0} orders
        </p>
        <p className={`text-sm ${getTrendColor()}`}>
          {aovData?.change > 0 ? '+' : ''}{aovData?.changePercent || 0}% vs previous 30 days
        </p>
        
        {/* Top Countries by AOV */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Top Countries by AOV</h4>
          {aovData?.topCountries.map((country, index) => (
            <div key={country.country} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                </div>
                <span>{country.country}</span>
              </div>
              <div className="text-right">
                <span className="font-medium">{formatAmount(country.aov)}</span>
                <span className="text-xs text-muted-foreground ml-1">({country.orders} orders)</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}; 