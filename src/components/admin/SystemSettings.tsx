import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Settings, DollarSign, Bell, RefreshCw, Heart } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { ConfigurationHealthCheck } from './ConfigurationHealthCheck';
import { useState } from 'react';

export const SystemSettings = () => {
  const {
    settings,
    isLoading,
    isUpdating,
    updateSetting,
    getBooleanSetting,
    _getNumericSetting,
    getSetting
  } = useSystemSettings();

  const [exchangeRateMarkup, setExchangeRateMarkup] = useState<string>('');
  const [updateInterval, setUpdateInterval] = useState<string>('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleExchangeRateMarkupSave = () => {
    const value = exchangeRateMarkup || getSetting('exchange_rate_markup_percentage');
    updateSetting('exchange_rate_markup_percentage', value);
    setExchangeRateMarkup('');
  };

  const handleUpdateIntervalSave = () => {
    const value = updateInterval || getSetting('exchange_rate_update_interval_hours');
    updateSetting('exchange_rate_update_interval_hours', value);
    setUpdateInterval('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          System Settings
        </h1>
        <p className="text-muted-foreground">
          Configure global system settings and feature toggles
        </p>
      </div>

      {/* Configuration Health Check */}
      <ConfigurationHealthCheck />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Exchange Rate Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Exchange Rate Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exchange-rate-markup">Exchange Rate Markup (%)</Label>
              <div className="flex gap-2">
                <Input
                  id="exchange-rate-markup"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder={getSetting('exchange_rate_markup_percentage')}
                  value={exchangeRateMarkup}
                  onChange={(e) => setExchangeRateMarkup(e.target.value)}
                />
                <Button onClick={handleExchangeRateMarkupSave} disabled={isUpdating} size="sm">
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Current: {getSetting('exchange_rate_markup_percentage')}% markup
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Exchange Rate Updates</Label>
                <p className="text-sm text-muted-foreground">Automatically update exchange rates</p>
              </div>
              <Switch
                checked={getBooleanSetting('auto_exchange_rate_enabled')}
                onCheckedChange={(checked) =>
                  updateSetting('auto_exchange_rate_enabled', checked.toString())
                }
                disabled={isUpdating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="update-interval">Update Interval (hours)</Label>
              <div className="flex gap-2">
                <Input
                  id="update-interval"
                  type="number"
                  min="1"
                  placeholder={getSetting('exchange_rate_update_interval_hours')}
                  value={updateInterval}
                  onChange={(e) => setUpdateInterval(e.target.value)}
                />
                <Button onClick={handleUpdateIntervalSave} disabled={isUpdating} size="sm">
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Current: Every {getSetting('exchange_rate_update_interval_hours')} hours
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Feature Toggles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Wishlist Feature
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to save items to wishlist
                </p>
              </div>
              <Switch
                checked={getBooleanSetting('wishlist_enabled')}
                onCheckedChange={(checked) => updateSetting('wishlist_enabled', checked.toString())}
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">System-wide email notifications</p>
              </div>
              <Switch
                checked={getBooleanSetting('email_notifications_enabled')}
                onCheckedChange={(checked) =>
                  updateSetting('email_notifications_enabled', checked.toString())
                }
                disabled={isUpdating}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Overview */}
      <Card>
        <CardHeader>
          <CardTitle>All Settings Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {settings?.map((setting) => (
              <div key={setting.id} className="p-3 border rounded-lg">
                <div className="font-medium text-sm">{setting.setting_key}</div>
                <div className="text-lg font-bold">{setting.setting_value}</div>
                {setting.description && (
                  <div className="text-xs text-muted-foreground mt-1">{setting.description}</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings;
