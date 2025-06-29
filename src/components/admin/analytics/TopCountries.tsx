import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserCurrency } from "@/hooks/useUserCurrency";

export const TopCountries = () => {
  const { formatAmount } = useUserCurrency();
  
  const { data: countryData, isLoading } = useQuery({
    queryKey: ['top-countries'],
    queryFn: async () => {
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('country_code, final_total_local, final_total, approval_status')
        .eq('approval_status', 'approved');
      
      if (error) throw error;

      // Group by country
      const countryStats = new Map();

      quotes?.forEach(quote => {
        const country = quote.country_code || 'Unknown';
        const current = countryStats.get(country) || { revenue: 0, orders: 0 };
        
        countryStats.set(country, {
          revenue: current.revenue + (quote.final_total_local ?? quote.final_total ?? 0),
          orders: current.orders + 1
        });
      });

      // Convert to array and sort by revenue
      const countriesByRevenue = Array.from(countryStats.entries())
        .map(([country, stats]) => ({
          country,
          revenue: stats.revenue,
          orders: stats.orders
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Sort by orders for second list
      const countriesByOrders = Array.from(countryStats.entries())
        .map(([country, stats]) => ({
          country,
          revenue: stats.revenue,
          orders: stats.orders
        }))
        .sort((a, b) => b.orders - a.orders)
        .slice(0, 5);

      return {
        countriesByRevenue,
        countriesByOrders,
        totalCountries: countryStats.size
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Countries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Top Countries
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* By Revenue */}
          <div>
            <h4 className="text-sm font-medium mb-3">By Revenue</h4>
            <div className="space-y-3">
              {countryData?.countriesByRevenue.map((item, index) => (
                <div key={item.country} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.country}</p>
                      <p className="text-xs text-muted-foreground">{item.orders} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatAmount(item.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Orders */}
          <div>
            <h4 className="text-sm font-medium mb-3">By Orders</h4>
            <div className="space-y-3">
              {countryData?.countriesByOrders.map((item, index) => (
                <div key={item.country} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-green-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.country}</p>
                      <p className="text-xs text-muted-foreground">{formatAmount(item.revenue)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{item.orders}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            {countryData?.totalCountries || 0} countries total
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 