import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { TrendingUp, TrendingDown, AlertTriangle, Target, DollarSign, Calendar } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";

type Quote = Tables<'quotes'>;

interface PredictiveInsightsProps {
  quotes: Quote[];
  orders: Quote[];
}

export const PredictiveInsights = ({ quotes, orders }: PredictiveInsightsProps) => {
  // Calculate trends and predictions
  const now = new Date();
  const lastMonth = subMonths(now, 1);
  const twoMonthsAgo = subMonths(now, 2);
  
  const currentMonthQuotes = quotes.filter(q => 
    new Date(q.created_at) >= new Date(now.getFullYear(), now.getMonth(), 1)
  ).length;
  
  const lastMonthQuotes = quotes.filter(q => {
    const date = new Date(q.created_at);
    return date >= new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1) &&
           date < new Date(now.getFullYear(), now.getMonth(), 1);
  }).length;
  
  const twoMonthsAgoQuotes = quotes.filter(q => {
    const date = new Date(q.created_at);
    return date >= new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 1) &&
           date < new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
  }).length;

  // Calculate growth rates
  const monthOverMonthGrowth = lastMonthQuotes > 0 ? 
    ((currentMonthQuotes - lastMonthQuotes) / lastMonthQuotes * 100) : 0;
  
  const quarterOverQuarterGrowth = twoMonthsAgoQuotes > 0 ? 
    ((lastMonthQuotes - twoMonthsAgoQuotes) / twoMonthsAgoQuotes * 100) : 0;

  // Predict next month
  const averageGrowth = (monthOverMonthGrowth + quarterOverQuarterGrowth) / 2;
  const predictedNextMonth = Math.round(currentMonthQuotes * (1 + averageGrowth / 100));

  // Calculate approval efficiency
  const approvedQuotes = quotes.filter(q => q.status === 'approved').length;
  const totalQuotes = quotes.length;
  const conversionRate = totalQuotes > 0 ? (approvedQuotes / totalQuotes) * 100 : 0;
  const pendingQuotes = quotes.filter(q => q.status === 'pending').length;

  // Calculate revenue predictions
  const avgQuoteValue = quotes.filter(q => q.final_total).length > 0 ?
    quotes.filter(q => q.final_total).reduce((sum, q) => sum + Number(q.final_total), 0) / quotes.filter(q => q.final_total).length :
    0;

  const predictedRevenue = predictedNextMonth * avgQuoteValue * (conversionRate / 100);

  // Identify bottlenecks
  const oldPendingQuotes = quotes.filter(q => {
    const createdDate = new Date(q.created_at);
    const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    return q.status === 'pending' && daysDiff > 7;
  }).length;

  // Generate insights
  const insights = [
    {
      type: 'growth',
      title: 'Quote Volume Trend',
      value: `${monthOverMonthGrowth > 0 ? '+' : ''}${monthOverMonthGrowth.toFixed(1)}%`,
      description: `${monthOverMonthGrowth > 0 ? 'Increase' : 'Decrease'} from last month`,
      icon: monthOverMonthGrowth > 0 ? TrendingUp : TrendingDown,
      color: monthOverMonthGrowth > 0 ? 'text-green-600' : 'text-red-600',
      bgColor: monthOverMonthGrowth > 0 ? 'bg-green-50' : 'bg-red-50'
    },
    {
      type: 'prediction',
      title: 'Next Month Forecast',
      value: `${predictedNextMonth} quotes`,
      description: `Based on current trends`,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      type: 'revenue',
      title: 'Predicted Revenue',
      value: `$${predictedRevenue.toFixed(2)}`,
      description: `Estimated for next month`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      type: 'efficiency',
      title: 'Approval Efficiency',
      value: `${conversionRate.toFixed(1)}%`,
      description: `${approvedQuotes} of ${totalQuotes} approved`,
      icon: Target,
      color: conversionRate > 75 ? 'text-green-600' : 'text-yellow-600',
      bgColor: conversionRate > 75 ? 'bg-green-50' : 'bg-yellow-50'
    }
  ];

  const recommendations = [
    {
      priority: 'high',
      title: 'Review Pending Quotes',
      description: `${pendingQuotes} quotes are pending review, ${oldPendingQuotes} are over 7 days old`,
      action: 'Prioritize quote reviews to improve response time',
      visible: pendingQuotes > 5
    },
    {
      priority: 'medium',
      title: 'Optimize Approval Rate',
      description: `Current approval rate is ${conversionRate.toFixed(1)}%`,
      action: conversionRate < 70 ? 'Review rejection reasons to improve quote quality' : 'Maintain current quality standards',
      visible: true
    },
    {
      priority: 'low',
      title: 'Growth Opportunity',
      description: `${monthOverMonthGrowth > 0 ? 'Positive' : 'Negative'} growth trend detected`,
      action: monthOverMonthGrowth > 0 ? 'Consider scaling operations' : 'Investigate causes for decline',
      visible: Math.abs(monthOverMonthGrowth) > 10
    }
  ];

  return (
    <div className="space-y-6">
      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((insight, index) => (
          <Card key={index} className={insight.bgColor}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{insight.title}</CardTitle>
              <insight.icon className={`h-4 w-4 ${insight.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${insight.color}`}>{insight.value}</div>
              <p className="text-xs text-muted-foreground">{insight.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Predictions */}
      <Card>
        <CardHeader>
          <CardTitle>Growth Analysis & Forecasting</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium">This Month</h4>
              <div className="text-2xl font-bold">{currentMonthQuotes}</div>
              <p className="text-sm text-muted-foreground">Quotes received</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Last Month</h4>
              <div className="text-2xl font-bold">{lastMonthQuotes}</div>
              <p className="text-sm text-muted-foreground">
                {monthOverMonthGrowth > 0 ? '+' : ''}{monthOverMonthGrowth.toFixed(1)}% change
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Predicted Next Month</h4>
              <div className="text-2xl font-bold text-blue-600">{predictedNextMonth}</div>
              <p className="text-sm text-muted-foreground">
                Based on {averageGrowth.toFixed(1)}% avg growth
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Actionable Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations
              .filter(rec => rec.visible)
              .map((rec, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg">
                  <div className={`p-2 rounded-full ${
                    rec.priority === 'high' ? 'bg-red-100' :
                    rec.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${
                      rec.priority === 'high' ? 'text-red-600' :
                      rec.priority === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{rec.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {rec.priority} priority
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                    <p className="text-sm font-medium mt-2">{rec.action}</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-lg font-semibold">Response Time</div>
              <div className="text-sm text-muted-foreground">
                {oldPendingQuotes > 0 ? `${oldPendingQuotes} quotes overdue` : 'All quotes current'}
              </div>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-lg font-semibold">Avg Quote Value</div>
              <div className="text-sm text-muted-foreground">${avgQuoteValue.toFixed(2)}</div>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-lg font-semibold">Growth Rate</div>
              <div className="text-sm text-muted-foreground">
                {averageGrowth.toFixed(1)}% monthly
              </div>
            </div>
            
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-lg font-semibold">Efficiency Score</div>
              <div className="text-sm text-muted-foreground">
                {(conversionRate + (monthOverMonthGrowth > 0 ? 10 : -10)).toFixed(0)}/100
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
