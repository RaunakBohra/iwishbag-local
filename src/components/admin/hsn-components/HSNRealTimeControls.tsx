/**
 * HSN Real-Time Controls
 * Controls for managing HSN calculation options and real-time features
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap, Globe, Tag, Scale, Settings, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { HSNRealTimeOptions } from '@/services/HSNQuoteIntegrationService';

interface HSNRealTimeControlsProps {
  options: HSNRealTimeOptions;
  onOptionsChange: (newOptions: Partial<HSNRealTimeOptions>) => void;
  systemStatus?: any;
  isCalculating?: boolean;
}

export const HSNRealTimeControls: React.FC<HSNRealTimeControlsProps> = ({
  options,
  onOptionsChange,
  systemStatus,
  isCalculating = false,
}) => {
  const handleToggle = (key: keyof HSNRealTimeOptions, value: boolean | string) => {
    onOptionsChange({ [key]: value });
  };

  const isSystemHealthy = systemStatus?.overall_status === 'healthy';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Real-Time Controls
          <Badge
            variant={options.enableGovernmentAPIs && isSystemHealthy ? 'default' : 'secondary'}
          >
            {options.enableGovernmentAPIs && isSystemHealthy ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Live
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Cached
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Government APIs Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Government APIs
            </Label>
            <p className="text-sm text-gray-600">Get real-time tax rates from official sources</p>
          </div>
          <div className="flex items-center gap-2">
            {!isSystemHealthy && (
              <Badge variant="destructive" className="text-xs">
                System Issues
              </Badge>
            )}
            <Switch
              checked={options.enableGovernmentAPIs}
              onCheckedChange={(checked) => handleToggle('enableGovernmentAPIs', checked)}
              disabled={isCalculating}
            />
          </div>
        </div>

        {/* Auto Classification Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Auto Classification
            </Label>
            <p className="text-sm text-gray-600">
              Automatically detect HSN codes from product data
            </p>
          </div>
          <Switch
            checked={options.enableAutoClassification}
            onCheckedChange={(checked) => handleToggle('enableAutoClassification', checked)}
            disabled={isCalculating}
          />
        </div>

        {/* Weight Detection Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Weight Detection
            </Label>
            <p className="text-sm text-gray-600">Auto-detect missing product weights</p>
          </div>
          <Switch
            checked={options.enableWeightDetection}
            onCheckedChange={(checked) => handleToggle('enableWeightDetection', checked)}
            disabled={isCalculating}
          />
        </div>

        {/* Minimum Valuation Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              Minimum Valuation
            </Label>
            <p className="text-sm text-gray-600">Apply government minimum valuation rules</p>
          </div>
          <Switch
            checked={options.enableMinimumValuation}
            onCheckedChange={(checked) => handleToggle('enableMinimumValuation', checked)}
            disabled={isCalculating}
          />
        </div>

        {/* Update Frequency */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Update Frequency
          </Label>
          <Select
            value={options.updateFrequency}
            onValueChange={(value) => handleToggle('updateFrequency', value)}
            disabled={isCalculating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">
                <div className="flex items-center gap-2">
                  <Zap className="h-3 w-3" />
                  Immediate
                </div>
              </SelectItem>
              <SelectItem value="batch">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3" />
                  Batch (30s)
                </div>
              </SelectItem>
              <SelectItem value="manual">
                <div className="flex items-center gap-2">
                  <Settings className="h-3 w-3" />
                  Manual Only
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cache Duration */}
        <div className="space-y-2">
          <Label>Cache Duration</Label>
          <Select
            value={options.cacheDuration.toString()}
            onValueChange={(value) => handleToggle('cacheDuration', parseInt(value))}
            disabled={isCalculating}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="300000">5 minutes</SelectItem>
              <SelectItem value="900000">15 minutes</SelectItem>
              <SelectItem value="1800000">30 minutes</SelectItem>
              <SelectItem value="3600000">1 hour</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Performance Mode Presets */}
        <div className="space-y-2">
          <Label>Performance Presets</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onOptionsChange({
                  enableGovernmentAPIs: true,
                  enableAutoClassification: true,
                  enableWeightDetection: true,
                  updateFrequency: 'immediate',
                  cacheDuration: 5 * 60 * 1000,
                })
              }
              disabled={isCalculating}
            >
              <Zap className="h-3 w-3 mr-1" />
              High Performance
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onOptionsChange({
                  enableGovernmentAPIs: true,
                  enableAutoClassification: false,
                  enableWeightDetection: false,
                  updateFrequency: 'batch',
                  cacheDuration: 15 * 60 * 1000,
                })
              }
              disabled={isCalculating}
            >
              <Globe className="h-3 w-3 mr-1" />
              Balanced
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onOptionsChange({
                  enableGovernmentAPIs: false,
                  enableAutoClassification: false,
                  enableWeightDetection: false,
                  updateFrequency: 'manual',
                  cacheDuration: 60 * 60 * 1000,
                })
              }
              disabled={isCalculating}
            >
              <Settings className="h-3 w-3 mr-1" />
              Conservative
            </Button>
          </div>
        </div>

        {/* System Status Summary */}
        {systemStatus && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">API Services</span>
              <div className="flex items-center gap-1">
                {Object.values(systemStatus.services).map((service: any, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      service.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
