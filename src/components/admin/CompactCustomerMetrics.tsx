// ============================================================================
// COMPACT CUSTOMER METRICS - Modern 2025 Dashboard Design
// Space-efficient horizontal layout following industry standards (Stripe, Linear, Notion)
// Replaces card-heavy grid layout with clean, information-dense display
// ============================================================================

import React from 'react';
import {
  Users,
  TrendingUp,
  Star,
  UserCheck,
  DollarSign,
  ShoppingCart,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomerAnalytics } from './CustomerTable';
import { Customer } from './CustomerTable';

interface CompactCustomerMetricsProps {
  customers: Customer[];
  customerAnalytics?: CustomerAnalytics[];
  isLoading: boolean;
}

interface MetricItem {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  color: string;
  icon: React.ElementType;
}

export const CompactCustomerMetrics: React.FC<CompactCustomerMetricsProps> = ({
  customers,
  customerAnalytics,
  isLoading,
}) => {
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-3 h-3" />;
      case 'down':
        return <ArrowDown className="w-3 h-3" />;
      case 'neutral':
        return <Minus className="w-3 h-3" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      case 'neutral':
        return 'text-gray-500 bg-gray-50';
    }
  };

  // Calculate metrics (same logic as original, more efficient)
  const totalCustomers = customers?.length || 0;
  const activeCustomers = customers?.filter((c) => c.cod_enabled)?.length || 0;
  const vipCustomers = customers?.filter((c) => c.internal_notes?.includes('VIP'))?.length || 0;

  // Time-based calculations
  const now = new Date();
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  const newThisMonth = customers?.filter((c) => new Date(c.created_at) >= monthAgo)?.length || 0;

  // Revenue and order metrics
  const totalRevenue = customerAnalytics?.reduce((sum, analytics) => sum + analytics.totalSpent, 0) || 0;
  const totalOrders = customerAnalytics?.reduce((sum, analytics) => sum + analytics.orderCount, 0) || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Customer health (simplified calculation)
  const healthyCustomers = customerAnalytics?.filter(a => a.totalSpent > 100 && a.orderCount > 1)?.length || 0;
  const healthPercentage = totalCustomers > 0 ? (healthyCustomers / totalCustomers) * 100 : 0;

  const metrics: MetricItem[] = [
    {
      id: 'total-customers',
      label: 'Total Customers',
      value: formatNumber(totalCustomers),
      change: newThisMonth > 0 ? `+${newThisMonth}` : '0',
      trend: newThisMonth > 0 ? 'up' : 'neutral',
      color: 'text-blue-700',
      icon: Users,
    },
    {
      id: 'total-revenue',
      label: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      change: totalCustomers > 0 ? `${formatCurrency(totalRevenue / totalCustomers)}/avg` : '$0',
      trend: totalRevenue > 50000 ? 'up' : totalRevenue > 10000 ? 'neutral' : 'down',
      color: 'text-emerald-700',
      icon: DollarSign,
    },
    {
      id: 'total-orders',
      label: 'Orders',
      value: formatNumber(totalOrders),
      change: totalCustomers > 0 ? `${(totalOrders / totalCustomers).toFixed(1)}/customer` : '0',
      trend: totalOrders > totalCustomers ? 'up' : 'neutral',
      color: 'text-purple-700',
      icon: ShoppingCart,
    },
    {
      id: 'avg-order',
      label: 'Avg Order',
      value: formatCurrency(avgOrderValue),
      change: totalOrders > 10 ? 'healthy' : 'low',
      trend: avgOrderValue > 100 ? 'up' : avgOrderValue > 50 ? 'neutral' : 'down',
      color: 'text-orange-700',
      icon: TrendingUp,
    },
    {
      id: 'active-customers',
      label: 'Active',
      value: `${activeCustomers}`,
      change: totalCustomers > 0 ? `${((activeCustomers / totalCustomers) * 100).toFixed(0)}%` : '0%',
      trend: activeCustomers > totalCustomers * 0.6 ? 'up' : 'neutral',
      color: 'text-green-700',
      icon: UserCheck,
    },
    {
      id: 'customer-health',
      label: 'Health Score',
      value: `${healthPercentage.toFixed(0)}%`,
      change: `${healthyCustomers} healthy`,
      trend: healthPercentage > 70 ? 'up' : healthPercentage > 40 ? 'neutral' : 'down',
      color: 'text-indigo-700',
      icon: Activity,
    },
  ];

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex space-x-6 overflow-x-auto pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 p-4 bg-gray-50 rounded-lg min-w-[180px]">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-8 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-7 w-16 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {/* Clean Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Customer Overview</h2>
          <p className="text-sm text-gray-600 mt-1">
            Key performance metrics for your customer base
          </p>
        </div>
      </div>

      {/* Horizontal Metrics Strip */}
      <div className="flex space-x-6 overflow-x-auto pb-2">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.id}
              className="flex-shrink-0 group hover:bg-gray-50 rounded-lg p-4 transition-colors duration-150 min-w-[180px] border border-transparent hover:border-gray-200"
            >
              {/* Icon & Trend Indicator */}
              <div className="flex items-center justify-between mb-3">
                <div className={cn("p-1.5 rounded-md bg-gray-100 group-hover:bg-white transition-colors", metric.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className={cn("flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full", getTrendColor(metric.trend))}>
                  {getTrendIcon(metric.trend)}
                </div>
              </div>

              {/* Value */}
              <div className="mb-2">
                <div className={cn("text-2xl font-bold", metric.color)}>
                  {metric.value}
                </div>
              </div>

              {/* Label & Change */}
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">
                  {metric.label}
                </div>
                <div className="text-xs text-gray-500">
                  {metric.change}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional: Quick Stats Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <span className="text-gray-600">
              <span className="font-medium text-gray-900">{vipCustomers}</span> VIP customers
            </span>
            <span className="text-gray-600">
              <span className="font-medium text-gray-900">{newThisMonth}</span> joined this month
            </span>
          </div>
          <div className="text-gray-500">
            Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};