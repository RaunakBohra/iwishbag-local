import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const ConversionRate = () => {
  const { data: conversionData, isLoading } = useQuery({
    queryKey: ['conversion-rate'],
    queryFn: async () => {
      // Get total quotes
      const { data: totalQuotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id')
        .not('status', 'eq', 'pending');
      
      if (quotesError) throw quotesError;

      // Get approved orders
      const { data: approvedQuotes, error: ordersError } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');
      
      if (ordersError) throw ordersError;

      const total = totalQuotes?.length || 0;
      const approved = approvedQuotes?.length || 0;
      const rate = total > 0 ? (approved / total) * 100 : 0;

      // Calculate previous period for comparison
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: prevTotalQuotes } = await supabase
        .from('quotes')
        .select('id')
        .not('status', 'eq', 'pending')
        .lt('created_at', thirtyDaysAgo.toISOString());
      
      const { data: prevApprovedQuotes } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .lt('created_at', thirtyDaysAgo.toISOString());

      const prevTotal = prevTotalQuotes?.length || 0;
      const prevApproved = prevApprovedQuotes?.length || 0;
      const prevRate = prevTotal > 0 ? (prevApproved / prevTotal) * 100 : 0;

      const change = rate - prevRate;
      const changePercent = prevRate > 0 ? (change / prevRate) * 100 : 0;

      return {
        rate: Math.round(rate * 100) / 100,
        total,
        approved,
        change,
        changePercent: Math.round(changePercent * 100) / 100
      };
    },
  });

  const getTrendIcon = () => {
    if (!conversionData) return <Minus className="h-4 w-4 text-gray-500" />;
    if (conversionData.change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (conversionData.change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = () => {
    if (!conversionData) return "text-gray-500";
    if (conversionData.change > 0) return "text-green-500";
    if (conversionData.change < 0) return "text-red-500";
    return "text-gray-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversion Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Conversion Rate
          {getTrendIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {conversionData?.rate || 0}%
        </div>
        <p className="text-sm text-muted-foreground">
          {conversionData?.approved || 0} of {conversionData?.total || 0} quotes converted
        </p>
        <p className={`text-sm ${getTrendColor()}`}>
          {conversionData?.change > 0 ? '+' : ''}{conversionData?.changePercent || 0}% from last 30 days
        </p>
      </CardContent>
    </Card>
  );
}; 