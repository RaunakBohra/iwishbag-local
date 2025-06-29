import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Clock, 
  AlertCircle,
  Mail,
  Send
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCurrencyDisplay } from "@/hooks/useAdminCurrencyDisplay";
import { MultiCurrencyDisplay } from "./MultiCurrencyDisplay";

interface CartMetrics {
  totalCarts: number;
  activeCarts: number;
  abandonedCarts: number;
  convertedCarts: number;
  totalCartValue: number;
  averageCartValue: number;
  abandonmentRate: number;
  conversionRate: number;
  averageTimeToAbandon: number;
  recentAbandonments: Array<{
    id: string;
    user_id: string;
    email: string;
    cart_value: number;
    abandoned_at: string;
    items_count: number;
  }>;
}

export const CartAnalytics = () => {
  const { formatMultiCurrency } = useAdminCurrencyDisplay();

  const { data: cartMetrics, isLoading } = useQuery({
    queryKey: ['cart-analytics'],
    queryFn: async (): Promise<CartMetrics> => {
      // Get all quotes that were added to cart
      const { data: cartQuotes, error: cartError } = await supabase
        .from('quotes')
        .select('*')
        .eq('in_cart', true);

      if (cartError) throw cartError;

      // Get abandoned carts (in_cart = true but no recent activity)
      const abandonedThreshold = new Date();
      abandonedThreshold.setHours(abandonedThreshold.getHours() - 24); // 24 hours

      const { data: abandonedQuotes, error: abandonedError } = await supabase
        .from('quotes')
        .select('*')
        .eq('in_cart', true)
        .lt('updated_at', abandonedThreshold.toISOString());

      if (abandonedError) throw abandonedError;

      // Get converted carts (quotes that became orders)
      const { data: convertedQuotes, error: convertedError } = await supabase
        .from('quotes')
        .select('*')
        .in('status', ['paid', 'ordered', 'shipped', 'completed']);

      if (convertedError) throw convertedError;

      // Get recent abandonments for email targeting
      const { data: recentAbandonments, error: recentError } = await supabase
        .from('quotes')
        .select(`
          id,
          user_id,
          email,
          final_total_local,
          updated_at,
          quantity
        `)
        .eq('in_cart', true)
        .lt('updated_at', abandonedThreshold.toISOString())
        .order('updated_at', { ascending: false })
        .limit(10);

      if (recentError) throw recentError;

      // Calculate metrics
      const totalCarts = cartQuotes?.length || 0;
      const abandonedCarts = abandonedQuotes?.length || 0;
      const convertedCarts = convertedQuotes?.length || 0;
      const activeCarts = totalCarts - abandonedCarts;

      const totalCartValue = cartQuotes?.reduce((sum, quote) => 
        sum + (quote.final_total_local || 0), 0) || 0;

      const averageCartValue = totalCarts > 0 ? totalCartValue / totalCarts : 0;
      const abandonmentRate = totalCarts > 0 ? (abandonedCarts / totalCarts) * 100 : 0;
      const conversionRate = totalCarts > 0 ? (convertedCarts / totalCarts) * 100 : 0;

      // Calculate average time to abandon (simplified)
      const averageTimeToAbandon = 24; // hours

      return {
        totalCarts,
        activeCarts,
        abandonedCarts,
        convertedCarts,
        totalCartValue,
        averageCartValue,
        abandonmentRate,
        conversionRate,
        averageTimeToAbandon,
        recentAbandonments: recentAbandonments?.map(quote => ({
          id: quote.id,
          user_id: quote.user_id,
          email: quote.email,
          cart_value: quote.final_total_local || 0,
          abandoned_at: quote.updated_at,
          items_count: quote.quantity || 1
        })) || []
      };
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const totalValueCurrencies = useMemo(() => {
    if (!cartMetrics?.totalCartValue) return [];
    return formatMultiCurrency({
      usdAmount: cartMetrics.totalCartValue,
      showAllVariations: false
    });
  }, [cartMetrics?.totalCartValue, formatMultiCurrency]);

  const averageValueCurrencies = useMemo(() => {
    if (!cartMetrics?.averageCartValue) return [];
    return formatMultiCurrency({
      usdAmount: cartMetrics.averageCartValue,
      showAllVariations: false
    });
  }, [cartMetrics?.averageCartValue, formatMultiCurrency]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Carts</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cartMetrics?.totalCarts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {cartMetrics?.activeCarts || 0} active, {cartMetrics?.abandonedCarts || 0} abandoned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cart Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalValueCurrencies.length > 0 ? (
                <MultiCurrencyDisplay 
                  currencies={totalValueCurrencies}
                  orientation="horizontal"
                  showLabels={false}
                  compact={true}
                />
              ) : (
                "$0.00"
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Average: {averageValueCurrencies.length > 0 ? (
                <MultiCurrencyDisplay 
                  currencies={averageValueCurrencies}
                  orientation="horizontal"
                  showLabels={false}
                  compact={true}
                />
              ) : (
                "$0.00"
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandonment Rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cartMetrics?.abandonmentRate.toFixed(1) || 0}%
            </div>
            <div className="mt-2">
              <Progress value={cartMetrics?.abandonmentRate || 0} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {cartMetrics?.abandonedCarts || 0} abandoned carts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cartMetrics?.conversionRate.toFixed(1) || 0}%
            </div>
            <div className="mt-2">
              <Progress value={cartMetrics?.conversionRate || 0} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {cartMetrics?.convertedCarts || 0} converted to orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Abandonments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Cart Abandonments
            <Badge variant="destructive">{cartMetrics?.recentAbandonments.length || 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cartMetrics?.recentAbandonments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent cart abandonments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartMetrics?.recentAbandonments.map((abandonment) => (
                <div key={abandonment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{abandonment.email}</span>
                      <Badge variant="outline">{abandonment.items_count} items</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Abandoned {new Date(abandonment.abandoned_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-bold">
                        {formatMultiCurrency({
                          usdAmount: abandonment.cart_value,
                          showAllVariations: false
                        }).map(currency => `${currency.symbol}${currency.amount}`).join(' / ')}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Recovery Email
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Abandonment Recovery Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Abandonment Recovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="w-full" variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Send Recovery Emails
            </Button>
            <Button className="w-full" variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              View Recovery Analytics
            </Button>
            <Button className="w-full" variant="outline">
              <AlertCircle className="h-4 w-4 mr-2" />
              Abandonment Insights
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 