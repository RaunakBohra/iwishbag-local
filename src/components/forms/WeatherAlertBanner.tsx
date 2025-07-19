import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Thermometer,
  Wind,
  Snowflake,
  Waves,
  Zap,
} from 'lucide-react';
import {
  getWeatherAlertsForRoute,
  getWeatherDelay,
  // generateWeatherAlertMessage,
  // WeatherAlert,
} from '@/lib/weather-impact';

interface WeatherAlertBannerProps {
  originCountry: string;
  destinationCountry: string;
  showDetails?: boolean;
  className?: string;
}

export const WeatherAlertBanner: React.FC<WeatherAlertBannerProps> = ({
  originCountry,
  destinationCountry,
  showDetails = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const alerts = getWeatherAlertsForRoute(originCountry, destinationCountry);
  const weatherDelay = getWeatherDelay(originCountry, destinationCountry);

  if (alerts.length === 0) {
    return null;
  }

  const getWeatherIcon = (type: string) => {
    switch (type) {
      case 'storm':
        return <CloudRain className="h-4 w-4" />;
      case 'flood':
        return <Waves className="h-4 w-4" />;
      case 'extreme_heat':
        return <Thermometer className="h-4 w-4" />;
      case 'extreme_cold':
        return <Snowflake className="h-4 w-4" />;
      case 'high_winds':
        return <Wind className="h-4 w-4" />;
      case 'snow':
        return <Snowflake className="h-4 w-4" />;
      case 'ice':
        return <Snowflake className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'extreme':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'extreme':
        return <Zap className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const highestSeverityAlert = alerts.reduce((highest, current) => {
    const severityOrder = { low: 1, medium: 2, high: 3, extreme: 4 };
    return severityOrder[current.severity] > severityOrder[highest.severity] ? current : highest;
  });

  return (
    <Alert className={`${className} ${getSeverityColor(highestSeverityAlert.severity)}`}>
      <div className="flex items-start gap-3">
        {getAlertIcon(highestSeverityAlert.severity)}
        <div className="flex-1">
          <AlertTitle className="flex items-center gap-2">
            Weather Alert
            <Badge variant="outline" className="text-xs">
              +{weatherDelay} day{weatherDelay > 1 ? 's' : ''} delay
            </Badge>
          </AlertTitle>
          <AlertDescription className="mt-1">
            <p className="text-sm">
              Weather conditions may affect delivery times for your route from {originCountry} to{' '}
              {destinationCountry}.
            </p>

            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-auto p-0 text-xs hover:bg-transparent"
                >
                  {isExpanded ? (
                    <>
                      Hide details <ChevronUp className="h-3 w-3 ml-1" />
                    </>
                  ) : (
                    <>
                      Show details <ChevronDown className="h-3 w-3 ml-1" />
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-3 space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-3 bg-white/50 rounded border">
                    <div className="flex items-start gap-2 mb-2">
                      {getWeatherIcon(alert.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm capitalize">
                            {alert.type.replace('_', ' ')}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getSeverityColor(alert.severity)}`}
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium">{alert.location}</p>
                      </div>
                    </div>

                    <p className="text-sm mb-2">{alert.description}</p>

                    <div className="flex items-center justify-between text-xs">
                      <span>
                        {alert.start_date.toLocaleDateString()} -{' '}
                        {alert.end_date.toLocaleDateString()}
                      </span>
                      <span className="font-medium">
                        +{alert.estimated_delay_days} day
                        {alert.estimated_delay_days > 1 ? 's' : ''} delay
                      </span>
                    </div>
                  </div>
                ))}

                <div className="p-2 bg-white/50 rounded text-xs">
                  <p className="font-medium mb-1">What this means for your delivery:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Your package may experience delays during transit</li>
                    <li>We'll keep you updated on any changes to delivery times</li>
                    <li>Tracking information will be available once shipping begins</li>
                  </ul>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};
