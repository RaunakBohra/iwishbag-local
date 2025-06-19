import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const ExportAnalytics = () => {
  const [exportType, setExportType] = useState<string>("quotes");
  const [dateRange, setDateRange] = useState<string>("30");

  const { data: exportData, isLoading } = useQuery({
    queryKey: ['export-analytics', exportType, dateRange],
    queryFn: async () => {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
      
      let query = supabase.from('quotes').select('*');
      
      if (exportType === "quotes") {
        query = query.gte('created_at', daysAgo.toISOString());
      } else if (exportType === "orders") {
        query = query.eq('approval_status', 'approved').gte('created_at', daysAgo.toISOString());
      } else if (exportType === "revenue") {
        query = query.eq('approval_status', 'approved').gte('created_at', daysAgo.toISOString());
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data;
    },
  });

  const exportToCSV = () => {
    if (!exportData || exportData.length === 0) {
      alert('No data to export');
      return;
    }

    // Define headers based on export type
    let headers: string[] = [];
    let csvContent = '';

    if (exportType === "quotes") {
      headers = ['ID', 'Email', 'Country', 'Status', 'Created At', 'Total Amount (Local)'];
      csvContent = headers.join(',') + '\n';
      
      exportData.forEach((item: any) => {
        const row = [
          item.id,
          item.email,
          item.country_code || 'N/A',
          item.approval_status || 'pending',
          new Date(item.created_at).toLocaleDateString(),
          item.final_total_local || item.final_total || 0
        ];
        csvContent += row.join(',') + '\n';
      });
    } else if (exportType === "orders") {
      headers = ['ID', 'Email', 'Country', 'Total Amount (Local)', 'Currency', 'Created At', 'Approved At'];
      csvContent = headers.join(',') + '\n';
      
      exportData.forEach((item: any) => {
        const row = [
          item.id,
          item.email,
          item.country_code || 'N/A',
          item.final_total_local || item.final_total || 0,
          item.final_currency || 'USD',
          new Date(item.created_at).toLocaleDateString(),
          item.approved_at ? new Date(item.approved_at).toLocaleDateString() : 'N/A'
        ];
        csvContent += row.join(',') + '\n';
      });
    } else if (exportType === "revenue") {
      headers = ['Date', 'Revenue (Local)', 'Orders', 'Average Order Value (Local)'];
      csvContent = headers.join(',') + '\n';
      
      // Group by date
      const dailyData = new Map();
      exportData.forEach((item: any) => {
        const date = new Date(item.created_at).toLocaleDateString();
        const current = dailyData.get(date) || { revenue: 0, orders: 0 };
        dailyData.set(date, {
          revenue: current.revenue + (item.final_total_local || item.final_total || 0),
          orders: current.orders + 1
        });
      });
      
      dailyData.forEach((data, date) => {
        const aov = data.orders > 0 ? data.revenue / data.orders : 0;
        const row = [
          date,
          data.revenue,
          data.orders,
          Math.round(aov * 100) / 100
        ];
        csvContent += row.join(',') + '\n';
      });
    }

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${exportType}_${dateRange}_days.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Export Type</label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quotes">All Quotes</SelectItem>
                  <SelectItem value="orders">Approved Orders</SelectItem>
                  <SelectItem value="revenue">Daily Revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {exportData ? (
              <span>{exportData.length} records found</span>
            ) : (
              <span>Loading...</span>
            )}
          </div>

          <Button 
            onClick={exportToCSV} 
            disabled={isLoading || !exportData || exportData.length === 0}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}; 