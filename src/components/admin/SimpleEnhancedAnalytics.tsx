import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";
import { TrendingUp, DollarSign, Users, Globe, Filter, Download, Package, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAllCountries } from "@/hooks/useAllCountries";
import { useStatusManagement } from '@/hooks/useStatusManagement';

type Quote = Tables<'quotes'>;

interface SimpleEnhancedAnalyticsProps {
  quotes: Quote[];
  orders: Quote[];
}

export const SimpleEnhancedAnalytics = ({ quotes, orders }: SimpleEnhancedAnalyticsProps) => {
  const [dateFilter, setDateFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: allCountries } = useAllCountries();
  const { quoteStatuses, orderStatuses } = useStatusManagement();

  // Get all available statuses for filtering
  const allStatuses = [...(quoteStatuses || []), ...(orderStatuses || [])]
    .filter(status => status.isActive)
    .sort((a, b) => a.order - b.order);

  const filteredData = useMemo(() => {
    let filtered = [...quotes];

    // Date filtering
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate = new Date();

      switch (dateFilter) {
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter(quote => 
        new Date(quote.created_at) >= startDate
      );
    }

    // Country filtering
    if (countryFilter !== 'all') {
      filtered = filtered.filter(quote => quote.country_code === countryFilter);
    }

    // Status filtering
    if (statusFilter !== 'all') {
      filtered = filtered.filter(quote => quote.status === statusFilter);
    }

    return filtered;
  }, [quotes, dateFilter, countryFilter, statusFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalQuotes = filteredData.length;
    const totalOrders = orders.filter(order => 
      filteredData.some(quote => quote.id === order.id)
    ).length;
    
    const totalRevenue = filteredData.reduce((sum, quote) => 
      sum + (quote.final_total || 0), 0
    );
    
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    const statusCounts = filteredData.reduce((acc, quote) => {
      acc[quote.status] = (acc[quote.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const countryCounts = filteredData.reduce((acc, quote) => {
      const country = quote.country_code || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalQuotes,
      totalOrders,
      totalRevenue,
      avgOrderValue,
      statusCounts,
      countryCounts,
      conversionRate: totalQuotes > 0 ? (totalOrders / totalQuotes) * 100 : 0
    };
  }, [filteredData, orders]);

  const uniqueCountries = [...new Set(quotes.map(q => q.country_code).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Analytics Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Time Period</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Country</label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {uniqueCountries.map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {allStatuses.map(status => (
                    <SelectItem key={status.name} value={status.name}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setDateFilter('all');
                  setCountryFilter('all');
                  setStatusFilter('all');
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtered Quotes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalQuotes}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalOrders} converted to orders
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From filtered data
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Quotes to orders
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per order
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.statusCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([status, count]) => {
                  const statusConfig = allStatuses.find(s => s.name === status);
                  const percentage = metrics.totalQuotes > 0 ? (count / metrics.totalQuotes) * 100 : 0;
                  
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={statusConfig?.color || 'outline'}>
                          {statusConfig?.label || status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{count}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(metrics.countryCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([country, count]) => {
                  const percentage = metrics.totalQuotes > 0 ? (count / metrics.totalQuotes) * 100 : 0;
                  
                  return (
                    <div key={country} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{country}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{count}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};