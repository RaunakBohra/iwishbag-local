import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign, TrendingUp, RefreshCw, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useExchangeRateWithMarkup } from "@/hooks/useExchangeRateWithMarkup";
import { useExchangeRateOperations } from "@/hooks/useExchangeRateOperations";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ExchangeRateManagement = () => {
  const { getNumericSetting, getBooleanSetting, getSetting } = useSystemSettings();
  const { countries, isLoading } = useExchangeRateWithMarkup();
  const { triggerUpdate, isUpdating } = useExchangeRateOperations();

  // Get last update information
  const { data: lastUpdateInfo } = useQuery({
    queryKey: ['last-exchange-update'],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value, description, updated_at')
        .in('setting_key', ['last_exchange_rate_update', 'last_exchange_rate_error'])
        .order('updated_at', { ascending: false });
      
      return data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markupPercentage = getNumericSetting('exchange_rate_markup_percentage');
  const autoUpdateEnabled = getBooleanSetting('auto_exchange_rate_enabled');
  const updateInterval = getNumericSetting('exchange_rate_update_interval_hours');

  const lastUpdate = lastUpdateInfo?.find(info => info.setting_key === 'last_exchange_rate_update');
  const lastError = lastUpdateInfo?.find(info => info.setting_key === 'last_exchange_rate_error');

  const formatLastUpdate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const getStatusColor = () => {
    if (lastError && (!lastUpdate || new Date(lastError.updated_at) > new Date(lastUpdate.updated_at))) {
      return 'destructive';
    }
    return lastUpdate ? 'default' : 'secondary';
  };

  const getStatusIcon = () => {
    if (lastError && (!lastUpdate || new Date(lastError.updated_at) > new Date(lastUpdate.updated_at))) {
      return <AlertCircle className="h-4 w-4" />;
    }
    return lastUpdate ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Exchange Rate Management
          </h2>
          <p className="text-muted-foreground">
            Monitor and manage exchange rates with markup
          </p>
        </div>
        <Button 
          onClick={() => triggerUpdate()}
          disabled={isUpdating}
          className="flex items-center gap-2"
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isUpdating ? 'Updating...' : 'Update Rates'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Current Markup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              {markupPercentage}%
            </div>
            <p className="text-xs text-muted-foreground">
              Applied to all exchange rates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Auto Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={autoUpdateEnabled ? "default" : "secondary"}>
                {autoUpdateEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {autoUpdateEnabled ? `Every ${updateInterval} hours` : 'Manual updates only'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Countries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countries?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Countries configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Update</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant={getStatusColor()} className="flex items-center gap-1 w-fit">
                {getStatusIcon()}
                {lastUpdate ? 'Updated' : 'Never'}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {formatLastUpdate(lastUpdate?.setting_value || null)}
              </p>
              {lastUpdate?.description && (
                <p className="text-xs text-muted-foreground">
                  {lastUpdate.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {lastError && (!lastUpdate || new Date(lastError.updated_at) > new Date(lastUpdate.updated_at)) && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Last Update Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <strong>Time:</strong> {formatLastUpdate(lastError.updated_at)}
            </p>
            {lastError.description && (
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Error:</strong> {lastError.description}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Exchange Rates with Markup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {countries?.slice(0, 12).map((country) => {
              const baseRate = Number(country.rate_from_usd) || 1;
              const markup = baseRate * (markupPercentage / 100);
              const finalRate = baseRate + markup;
              
              return (
                <div key={country.code} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{country.name}</span>
                    <Badge variant="outline">{country.currency}</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Rate:</span>
                      <span>{baseRate.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Markup:</span>
                      <span className="text-green-600">+{markup.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Final Rate:</span>
                      <span>{finalRate.toFixed(4)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(country.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {countries && countries.length > 12 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Showing first 12 countries. Total: {countries.length} countries
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
