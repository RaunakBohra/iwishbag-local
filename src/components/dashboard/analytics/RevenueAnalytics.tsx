import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";

type Quote = Tables<'quotes'>;

interface RevenueAnalyticsProps {
  quotes: Quote[];
  orders: Quote[];
}

export const RevenueAnalytics = ({ quotes, orders }: RevenueAnalyticsProps) => {
  // Monthly revenue data
  const monthlyRevenue = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthKey = format(startOfMonth(date), 'yyyy-MM');
    const monthName = format(date, 'MMM yy');
    
    const monthOrders = orders.filter(o => o.created_at.startsWith(monthKey));
    const revenue = monthOrders
      .filter(o => o.final_total)
      .reduce((sum, o) => sum + Number(o.final_total), 0);
    
    const orderCount = monthOrders.length;
    const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;
    
    return {
      month: monthName,
      revenue: revenue,
      orders: orderCount,
      avgOrderValue: avgOrderValue
    };
  });

  // Revenue by country
  const revenueByCountry = quotes.reduce((acc, quote) => {
    if (quote.country_code && quote.final_total) {
      const country = quote.country_code;
      if (!acc[country]) {
        acc[country] = { revenue: 0, orders: 0 };
      }
      acc[country].revenue += Number(quote.final_total);
      acc[country].orders += 1;
    }
    return acc;
  }, {} as Record<string, { revenue: number; orders: number }>);

  const countryRevenueData = Object.entries(revenueByCountry)
    .sort(([,a], [,b]) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(([country, data]) => ({
      country,
      revenue: data.revenue,
      orders: data.orders,
      avgValue: data.revenue / data.orders
    }));

  const totalRevenue = orders
    .filter(o => o.final_total)
    .reduce((sum, o) => sum + Number(o.final_total), 0);

  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return (
    <div className="space-y-6">
      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All-time revenue</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">Completed orders</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per order average</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'revenue' || name === 'avgOrderValue') {
                      return [`$${Number(value).toFixed(2)}`, name === 'revenue' ? 'Revenue' : 'Avg Order Value'];
                    }
                    return [value, 'Orders'];
                  }}
                />
                <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Revenue" />
                <Line yAxisId="right" type="monotone" dataKey="avgOrderValue" stroke="#ff7300" strokeWidth={2} name="Avg Order Value" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Country</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={countryRevenueData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="country" type="category" width={60} />
                <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {countryRevenueData.map((item, index) => (
                <div key={item.country} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{item.country}</div>
                    <div className="text-sm text-muted-foreground">{item.orders} orders</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${item.revenue.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground">${item.avgValue.toFixed(2)} avg</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
