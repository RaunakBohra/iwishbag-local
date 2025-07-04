import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Tables } from "@/integrations/supabase/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";

type Quote = Tables<'quotes'>;

interface TrendAnalysisProps {
  quotes: Quote[];
  orders: Quote[];
}

export const TrendAnalysis = ({ quotes, orders }: TrendAnalysisProps) => {
  // Generate monthly data for the last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthKey = format(startOfMonth(date), 'yyyy-MM');
    const monthName = format(date, 'MMM yy');
    
    const monthQuotes = quotes.filter(q => q.created_at.startsWith(monthKey));
    const monthOrders = orders.filter(o => o.created_at.startsWith(monthKey));
    const monthApproved = quotes.filter(q => q.status === 'approved' && q.created_at.startsWith(monthKey));
    const monthRejected = quotes.filter(q => q.status === 'rejected' && q.created_at.startsWith(monthKey));
    
    const revenue = monthOrders
      .filter(o => o.final_total)
      .reduce((sum, o) => sum + Number(o.final_total), 0);
    
    return {
      month: monthName,
      quotes: monthQuotes.length,
      orders: monthOrders.length,
      approved: monthApproved.length,
      rejected: monthRejected.length,
      revenue: revenue,
      approvalRate: monthQuotes.length > 0 ? (monthApproved.length / monthQuotes.length * 100) : 0
    };
  });

  // Weekly data for the last 4 weeks
  const weeklyData = Array.from({ length: 4 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (3 - i) * 7);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    
    const weekQuotes = quotes.filter(q => {
      const quoteDate = new Date(q.created_at);
      return quoteDate >= weekStart && quoteDate < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    });
    
    return {
      week: `Week ${i + 1}`,
      quotes: weekQuotes.length,
      pending: weekQuotes.filter(q => q.status === 'pending').length,
      approved: weekQuotes.filter(q => q.status === 'approved').length
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Quote Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="quotes" stroke="#8884d8" strokeWidth={2} name="Total Quotes" />
              <Line type="monotone" dataKey="approved" stroke="#82ca9d" strokeWidth={2} name="Approved" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quotes" fill="#8884d8" name="Total Quotes" />
              <Bar dataKey="approved" fill="#82ca9d" name="Approved" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval Rate Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Approval Rate']} />
              <Line type="monotone" dataKey="approvalRate" stroke="#ff7300" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
