import { formatCurrencyCompact, formatChangePercentage } from '@/lib/adminCurrencyUtils';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Target,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface MetricsData {
  total: number;
  pending: number;
  sent: number;
  approved: number;
  paid: number;
  completed: number;
  totalValue: number;
}

interface CompactQuoteMetricsProps {
  metrics: MetricsData;
  currency?: string; // Currency for displaying metrics
  isLoading?: boolean;
}

interface CompactMetricProps {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

const CompactMetric = ({ label, value, change, changeType, icon }: CompactMetricProps) => (
  <div className="flex items-center gap-2 min-w-0">
    <div className="flex items-center gap-1.5 text-gray-600">
      {icon}
      <span className="text-xs font-medium truncate">{label}</span>
    </div>
    <div className="flex items-center gap-1 min-w-0">
      <span className="text-sm font-semibold text-gray-900 truncate">{value}</span>
      {change && (
        <div className="flex items-center gap-0.5">
          {changeType === 'positive' && <TrendingUp className="h-3 w-3 text-green-600" />}
          {changeType === 'negative' && <TrendingDown className="h-3 w-3 text-red-600" />}
          <span
            className={`text-xs font-medium ${
              changeType === 'positive'
                ? 'text-green-600'
                : changeType === 'negative'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {change}
          </span>
        </div>
      )}
    </div>
  </div>
);

export const CompactQuoteMetrics = ({ metrics, currency = 'USD', isLoading }: CompactQuoteMetricsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Quote Analytics</h3>
          <div className="animate-pulse h-4 w-16 bg-gray-200 rounded"></div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Extract metrics
  const totalQuotes = metrics.total;
  const totalRevenue = metrics.totalValue;
  const averageValue = totalQuotes > 0 ? totalRevenue / totalQuotes : 0;
  const pendingQuotes = metrics.pending;
  const approvedQuotes = metrics.approved;
  const paidQuotes = metrics.paid;
  const completedQuotes = metrics.completed;
  const sentQuotes = metrics.sent;
  
  // Calculate additional metrics
  const rejectedQuotes = 0; // Not provided in metrics, default to 0
  const highPriorityQuotes = 0; // Not provided in metrics, default to 0

  // Calculate conversion rate
  const conversionRate = totalQuotes > 0 ? (paidQuotes / totalQuotes) * 100 : 0;

  // Mock previous period data for percentage changes
  const previousPeriod = {
    totalQuotes: Math.floor(totalQuotes * 0.9),
    totalRevenue: totalRevenue * 0.85,
    conversionRate: conversionRate * 0.95,
    averageValue: averageValue * 1.05,
    highPriorityQuotes: highPriorityQuotes * 1.1,
  };

  const revenueChange = formatChangePercentage(totalRevenue, previousPeriod.totalRevenue);
  const quotesChange = formatChangePercentage(totalQuotes, previousPeriod.totalQuotes);
  const conversionChange = formatChangePercentage(conversionRate, previousPeriod.conversionRate);
  const avgValueChange = formatChangePercentage(averageValue, previousPeriod.averageValue);
  const priorityChange = formatChangePercentage(
    highPriorityQuotes,
    previousPeriod.highPriorityQuotes,
  );

  const primaryMetrics = [
    {
      label: 'Revenue',
      value: formatCurrencyCompact(totalRevenue, currency),
      change: revenueChange.change,
      changeType: revenueChange.type,
      icon: <DollarSign className="h-3.5 w-3.5" />,
    },
    {
      label: 'Quotes',
      value: totalQuotes.toString(),
      change: quotesChange.change,
      changeType: quotesChange.type,
      icon: <FileText className="h-3.5 w-3.5" />,
    },
    {
      label: 'Conversion',
      value: `${conversionRate.toFixed(1)}%`,
      change: conversionChange.change,
      changeType: conversionChange.type,
      icon: <Target className="h-3.5 w-3.5" />,
    },
    {
      label: 'High Priority',
      value: highPriorityQuotes.toString(),
      change: priorityChange.change,
      changeType: priorityChange.type,
      icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
  ];

  const secondaryMetrics = [
    { label: 'Pending', value: pendingQuotes.toString(), status: 'pending' },
    { label: 'Sent', value: sentQuotes.toString(), status: 'sent' },
    { label: 'Approved', value: approvedQuotes.toString(), status: 'approved' },
    { label: 'Paid', value: paidQuotes.toString(), status: 'paid' },
    { label: 'Completed', value: completedQuotes.toString(), status: 'completed' },
    { label: 'Avg Value', value: formatCurrencyCompact(averageValue, currency), status: 'neutral' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-indigo-100 text-indigo-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      {/* Header with expand/collapse */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Quote Analytics</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 px-2 text-xs"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Details
            </>
          )}
        </Button>
      </div>

      {/* Primary metrics - always visible */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        {primaryMetrics.map((metric, index) => (
          <CompactMetric key={index} {...metric} />
        ))}
      </div>

      {/* Secondary metrics - expandable */}
      {isExpanded && (
        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="flex flex-wrap gap-2">
            {secondaryMetrics.map((metric, index) => (
              <Badge
                key={index}
                variant="secondary"
                className={`${getStatusColor(metric.status)} text-xs font-medium`}
              >
                {metric.label}: {metric.value}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
