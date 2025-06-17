
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Cell } from "recharts";
import { ArrowDown } from "lucide-react";

type Quote = Tables<'quotes'>;

interface ConversionFunnelProps {
  quotes: Quote[];
}

export const ConversionFunnel = ({ quotes }: ConversionFunnelProps) => {
  // Calculate funnel stages
  const totalQuotes = quotes.length;
  const sentQuotes = quotes.filter(q => q.status !== 'draft').length;
  const approvedQuotes = quotes.filter(q => q.approval_status === 'approved').length;
  const cartQuotes = quotes.filter(q => q.in_cart === true).length;
  const paidQuotes = quotes.filter(q => q.status === 'paid' || q.paid_at).length;
  const completedQuotes = quotes.filter(q => q.status === 'completed').length;

  const funnelData = [
    { stage: 'Quotes Created', count: totalQuotes, percentage: 100 },
    { stage: 'Quotes Sent', count: sentQuotes, percentage: totalQuotes > 0 ? (sentQuotes / totalQuotes * 100) : 0 },
    { stage: 'Approved', count: approvedQuotes, percentage: totalQuotes > 0 ? (approvedQuotes / totalQuotes * 100) : 0 },
    { stage: 'In Cart', count: cartQuotes, percentage: totalQuotes > 0 ? (cartQuotes / totalQuotes * 100) : 0 },
    { stage: 'Paid', count: paidQuotes, percentage: totalQuotes > 0 ? (paidQuotes / totalQuotes * 100) : 0 },
    { stage: 'Completed', count: completedQuotes, percentage: totalQuotes > 0 ? (completedQuotes / totalQuotes * 100) : 0 }
  ];

  // Calculate conversion rates between stages
  const conversionRates = [
    { from: 'Created', to: 'Sent', rate: totalQuotes > 0 ? (sentQuotes / totalQuotes * 100) : 0 },
    { from: 'Sent', to: 'Approved', rate: sentQuotes > 0 ? (approvedQuotes / sentQuotes * 100) : 0 },
    { from: 'Approved', to: 'Cart', rate: approvedQuotes > 0 ? (cartQuotes / approvedQuotes * 100) : 0 },
    { from: 'Cart', to: 'Paid', rate: cartQuotes > 0 ? (paidQuotes / cartQuotes * 100) : 0 },
    { from: 'Paid', to: 'Completed', rate: paidQuotes > 0 ? (completedQuotes / paidQuotes * 100) : 0 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, totalQuotes]} />
                <YAxis dataKey="stage" type="category" width={80} />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value} (${funnelData.find(d => d.count === value)?.percentage.toFixed(1)}%)`,
                    'Count'
                  ]}
                />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stage Conversion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={conversionRates}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="from" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Conversion Rate']} />
                <Bar dataKey="rate" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Funnel Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {funnelData.map((stage, index) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <div className="font-medium">{stage.stage}</div>
                      <div className="text-sm text-muted-foreground">
                        {stage.count} quotes ({stage.percentage.toFixed(1)}% of total)
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{stage.count}</div>
                    {index < conversionRates.length && (
                      <div className="text-sm text-green-600">
                        {conversionRates[index].rate.toFixed(1)}% conversion
                      </div>
                    )}
                  </div>
                </div>
                {index < funnelData.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900">Overall Conversion Rate</h4>
              <p className="text-2xl font-bold text-blue-700">
                {totalQuotes > 0 ? (completedQuotes / totalQuotes * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-blue-600">From quote to completion</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900">Best Converting Stage</h4>
              <p className="text-2xl font-bold text-green-700">
                {Math.max(...conversionRates.map(r => r.rate)).toFixed(1)}%
              </p>
              <p className="text-sm text-green-600">
                {conversionRates.find(r => r.rate === Math.max(...conversionRates.map(cr => cr.rate)))?.from} → {conversionRates.find(r => r.rate === Math.max(...conversionRates.map(cr => cr.rate)))?.to}
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900">Needs Improvement</h4>
              <p className="text-2xl font-bold text-yellow-700">
                {Math.min(...conversionRates.map(r => r.rate)).toFixed(1)}%
              </p>
              <p className="text-sm text-yellow-600">
                {conversionRates.find(r => r.rate === Math.min(...conversionRates.map(cr => cr.rate)))?.from} → {conversionRates.find(r => r.rate === Math.min(...conversionRates.map(cr => cr.rate)))?.to}
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900">Drop-off Rate</h4>
              <p className="text-2xl font-bold text-purple-700">
                {totalQuotes > 0 ? ((totalQuotes - completedQuotes) / totalQuotes * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-purple-600">{totalQuotes - completedQuotes} quotes lost</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
