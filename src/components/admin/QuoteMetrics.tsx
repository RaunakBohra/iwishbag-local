import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertCircle,
  Target
} from 'lucide-react';
import { BodySmall } from '@/components/ui/typography';

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  profiles?: { preferred_display_currency?: string } | null;
};

interface QuoteMetricsProps {
  quotes: QuoteWithItems[];
  isLoading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  iconColor: string;
  description?: string;
}

const MetricCard = ({ title, value, change, changeType, icon, iconColor, description }: MetricCardProps) => (
  <Card className="border-gray-200 hover:border-gray-300 transition-colors">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg ${iconColor} flex items-center justify-center`}>
              {icon}
            </div>
            <div>
              <BodySmall className="text-gray-600 font-medium">{title}</BodySmall>
              {description && (
                <BodySmall className="text-gray-500 text-xs">{description}</BodySmall>
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-semibold text-gray-900">{value}</div>
            {change && (
              <div className="flex items-center gap-1">
                {changeType === 'positive' && <TrendingUp className="h-3 w-3 text-green-600" />}
                {changeType === 'negative' && <TrendingDown className="h-3 w-3 text-red-600" />}
                <BodySmall className={`font-medium ${
                  changeType === 'positive' ? 'text-green-600' : 
                  changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {change}
                </BodySmall>
              </div>
            )}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
};

const getChangePercentage = (current: number, previous: number): { change: string; type: 'positive' | 'negative' | 'neutral' } => {
  if (previous === 0) return { change: 'N/A', type: 'neutral' };
  
  const percentage = ((current - previous) / previous) * 100;
  const sign = percentage > 0 ? '+' : '';
  
  return {
    change: `${sign}${percentage.toFixed(1)}%`,
    type: percentage > 0 ? 'positive' : percentage < 0 ? 'negative' : 'neutral'
  };
};

export const QuoteMetrics = ({ quotes, isLoading }: QuoteMetricsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="border-gray-200">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1" />
                    <div className="h-2 bg-gray-200 rounded w-20" />
                  </div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate metrics
  const totalQuotes = quotes.length;
  const totalRevenue = quotes.reduce((sum, quote) => sum + (quote.final_total || 0), 0);
  const averageValue = totalQuotes > 0 ? totalRevenue / totalQuotes : 0;
  
  // Status counts
  const pendingQuotes = quotes.filter(q => q.status === 'pending').length;
  const approvedQuotes = quotes.filter(q => q.status === 'approved').length;
  const paidQuotes = quotes.filter(q => ['paid', 'ordered', 'shipped', 'completed'].includes(q.status)).length;
  const rejectedQuotes = quotes.filter(q => ['rejected', 'cancelled'].includes(q.status)).length;
  const highPriorityQuotes = quotes.filter(q => q.priority === 'high').length;
  
  // Calculate conversion rate
  const conversionRate = totalQuotes > 0 ? (paidQuotes / totalQuotes) * 100 : 0;
  
  // Mock previous period data for percentage changes (in real implementation, this would come from props)
  const previousPeriod = {
    totalQuotes: Math.floor(totalQuotes * 0.9),
    totalRevenue: totalRevenue * 0.85,
    conversionRate: conversionRate * 0.95,
    averageValue: averageValue * 1.05,
    highPriorityQuotes: highPriorityQuotes * 1.1,
  };
  
  const revenueChange = getChangePercentage(totalRevenue, previousPeriod.totalRevenue);
  const quotesChange = getChangePercentage(totalQuotes, previousPeriod.totalQuotes);
  const conversionChange = getChangePercentage(conversionRate, previousPeriod.conversionRate);
  const avgValueChange = getChangePercentage(averageValue, previousPeriod.averageValue);
  const priorityChange = getChangePercentage(highPriorityQuotes, previousPeriod.highPriorityQuotes);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(totalRevenue)}
        change={revenueChange.change}
        changeType={revenueChange.type}
        icon={<DollarSign className="h-5 w-5 text-green-600" />}
        iconColor="bg-green-50"
        description="This month"
      />
      
      <MetricCard
        title="Total Quotes"
        value={totalQuotes.toString()}
        change={quotesChange.change}
        changeType={quotesChange.type}
        icon={<FileText className="h-5 w-5 text-blue-600" />}
        iconColor="bg-blue-50"
        description="All time"
      />
      
      <MetricCard
        title="Conversion Rate"
        value={`${conversionRate.toFixed(1)}%`}
        change={conversionChange.change}
        changeType={conversionChange.type}
        icon={<Target className="h-5 w-5 text-purple-600" />}
        iconColor="bg-purple-50"
        description="Paid quotes"
      />
      
      <MetricCard
        title="Average Value"
        value={formatCurrency(averageValue)}
        change={avgValueChange.change}
        changeType={avgValueChange.type}
        icon={<TrendingUp className="h-5 w-5 text-indigo-600" />}
        iconColor="bg-indigo-50"
        description="Per quote"
      />
      
      <MetricCard
        title="High Priority"
        value={highPriorityQuotes.toString()}
        change={priorityChange.change}
        changeType={priorityChange.type}
        icon={<AlertCircle className="h-5 w-5 text-red-600" />}
        iconColor="bg-red-50"
        description="Urgent quotes"
      />
    </div>
  );
};