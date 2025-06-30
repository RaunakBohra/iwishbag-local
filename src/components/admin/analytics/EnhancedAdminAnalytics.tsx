import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tables } from "@/integrations/supabase/types";
import { TrendingUp, DollarSign, Users, Globe, Filter, Download } from "lucide-react";
import { OverviewMetrics } from "../dashboard/analytics/OverviewMetrics";
import { TrendAnalysis } from "../dashboard/analytics/TrendAnalysis";
import { StatusDistribution } from "../dashboard/analytics/StatusDistribution";
import { RevenueAnalytics } from "../dashboard/analytics/RevenueAnalytics";
import { ConversionFunnel } from "../dashboard/analytics/ConversionFunnel";
import { PredictiveInsights } from "../dashboard/analytics/PredictiveInsights";
import { useAllCountries } from "@/hooks/useAllCountries";
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { Badge } from "@/components/ui/badge";

type Quote = Tables<'quotes'>;

interface EnhancedAdminAnalyticsProps {
  quotes: Quote[];
  orders: Quote[];
}

export const EnhancedAdminAnalytics = ({ quotes, orders }: EnhancedAdminAnalyticsProps) => {
  const [dateFilter, setDateFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });

  const { data: allCountries } = useAllCountries();
  const { quoteStatuses } = useStatusManagement();

  // Get only quote statuses for filtering
  const availableQuoteStatuses = (quoteStatuses || [])
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
        case 'custom':
          if (customDateRange.start) startDate = new Date(customDateRange.start);
          break;
      }

      filtered = filtered.filter(quote => {
        const quoteDate = new Date(quote.created_at);
        return quoteDate >= startDate && 
               (dateFilter !== 'custom' || !customDateRange.end || quoteDate <= new Date(customDateRange.end));
      });
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
  }, [quotes, dateFilter, countryFilter, statusFilter, customDateRange]);

  const exportData = () => {
    const csvContent = [
      ['ID', 'Product', 'Status', 'Country', 'Total', 'Created At'],
      ...filteredData.map(quote => [
        quote.display_id,
        quote.product_name,
        quote.status,
        quote.country_code,
        quote.final_total,
        new Date(quote.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotes-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights into your business performance</p>
        </div>
        <Button onClick={exportData}>
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Date Range</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                  <SelectItem value="90d">Last 90 Days</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Country</Label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {allCountries?.map(country => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {availableQuoteStatuses.map((status) => (
                    <SelectItem key={status.name} value={status.name}>
                      <div className="flex items-center gap-2">
                        <Badge variant={status.color} className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dateFilter === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="status">Status Distribution</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewMetrics quotes={filteredData} />
        </TabsContent>

        <TabsContent value="trends">
          <TrendAnalysis quotes={filteredData} />
        </TabsContent>

        <TabsContent value="status">
          <StatusDistribution quotes={filteredData} />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueAnalytics quotes={filteredData} />
        </TabsContent>

        <TabsContent value="conversion">
          <ConversionFunnel quotes={filteredData} />
        </TabsContent>

        <TabsContent value="predictions">
          <PredictiveInsights quotes={filteredData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 