
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tables } from "@/integrations/supabase/types";
import { TrendingUp, DollarSign, Clock, ShoppingCart, AlertTriangle, Target } from "lucide-react";
import { OverviewMetrics } from "./analytics/OverviewMetrics";
import { TrendAnalysis } from "./analytics/TrendAnalysis";
import { StatusDistribution } from "./analytics/StatusDistribution";
import { RevenueAnalytics } from "./analytics/RevenueAnalytics";
import { ConversionFunnel } from "./analytics/ConversionFunnel";
import { PredictiveInsights } from "./analytics/PredictiveInsights";

type Quote = Tables<'quotes'>;

interface EnhancedDashboardAnalyticsProps {
  quotes: Quote[];
  orders: Quote[];
}

export const EnhancedDashboardAnalytics = ({ quotes, orders }: EnhancedDashboardAnalyticsProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Comprehensive insights into your quote and order performance</p>
        </div>
      </div>

      <OverviewMetrics quotes={quotes} orders={orders} />

      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="trends" className="space-y-4">
          <TrendAnalysis quotes={quotes} orders={orders} />
        </TabsContent>
        
        <TabsContent value="distribution" className="space-y-4">
          <StatusDistribution quotes={quotes} />
        </TabsContent>
        
        <TabsContent value="revenue" className="space-y-4">
          <RevenueAnalytics quotes={quotes} orders={orders} />
        </TabsContent>
        
        <TabsContent value="funnel" className="space-y-4">
          <ConversionFunnel quotes={quotes} />
        </TabsContent>
        
        <TabsContent value="insights" className="space-y-4">
          <PredictiveInsights quotes={quotes} orders={orders} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
