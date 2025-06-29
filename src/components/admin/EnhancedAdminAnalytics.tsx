
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

    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      let includeByDate = true;
      
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

        includeByDate = orderDate >= startDate && 
                      (dateFilter !== 'custom' || !customDateRange.end || orderDate <= new Date(customDateRange.end));
      }

      const includeByCountry = countryFilter === 'all' || order.country_code === countryFilter;

      return includeByDate && includeByCountry;
    });

    return { quotes: filtered, orders: filteredOrders };
  }, [quotes, orders, dateFilter, countryFilter, statusFilter, customDateRange]);

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Email,Status,Country,Total,Created At\n"
      + filteredData.quotes.map(quote => 
          `${quote.display_id},${quote.email},${quote.status},${quote.country_code},${quote.final_total || 0},${quote.created_at}`
        ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "quotes_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Business Analytics</h2>
          <p className="text-muted-foreground">Comprehensive insights and performance metrics</p>
        </div>
        <Button onClick={exportData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

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
              <Label htmlFor="date-filter">Date Range</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
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

            {dateFilter === 'custom' && (
              <>
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="country-filter">Country</Label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {allCountries?.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="calculated">Calculated</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <OverviewMetrics quotes={filteredData.quotes} orders={filteredData.orders} />

      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trends" className="space-y-4">
          <TrendAnalysis quotes={filteredData.quotes} orders={filteredData.orders} />
        </TabsContent>
        
        <TabsContent value="distribution" className="space-y-4">
          <StatusDistribution quotes={filteredData.quotes} />
        </TabsContent>
        
        <TabsContent value="revenue" className="space-y-4">
          <RevenueAnalytics quotes={filteredData.quotes} orders={filteredData.orders} />
        </TabsContent>
        
        <TabsContent value="funnel" className="space-y-4">
          <ConversionFunnel quotes={filteredData.quotes} />
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-4">
          <PredictiveInsights quotes={filteredData.quotes} orders={filteredData.orders} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
