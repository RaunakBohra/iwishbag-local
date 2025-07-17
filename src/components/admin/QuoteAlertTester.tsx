import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  QuoteCalculationErrorCode,
  testQuoteAlert,
  getAlertSummary,
  setAlertingEnabled,
  errorHandlingService,
} from '@/services/ErrorHandlingService';
import { Bell, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

/**
 * Admin component for testing the quote alert system
 */
export function QuoteAlertTester() {
  const [selectedError, setSelectedError] = useState<QuoteCalculationErrorCode>(
    QuoteCalculationErrorCode.CALCULATION_FAILED,
  );
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [alertSummary, setAlertSummary] = useState(getAlertSummary());
  const [lastTestResult, setLastTestResult] = useState<string>('');

  const criticalErrors = [
    QuoteCalculationErrorCode.CALCULATION_TIMEOUT,
    QuoteCalculationErrorCode.SERVICE_UNAVAILABLE,
    QuoteCalculationErrorCode.HIGH_ERROR_RATE,
    QuoteCalculationErrorCode.CALCULATION_FAILED,
    QuoteCalculationErrorCode.CIRCUIT_BREAKER_OPEN,
    QuoteCalculationErrorCode.DATABASE_ERROR,
    QuoteCalculationErrorCode.SHIPPING_COST_API_ERROR,
  ];

  const warningErrors = [
    QuoteCalculationErrorCode.SLOW_CALCULATION,
    QuoteCalculationErrorCode.FALLBACK_USED,
    QuoteCalculationErrorCode.PRICE_DEVIATION_EXTREME,
    QuoteCalculationErrorCode.CONVERSION_RATE_DROP,
    QuoteCalculationErrorCode.ABANDONMENT_RATE_HIGH,
  ];

  const handleTestAlert = () => {
    testQuoteAlert(selectedError);
    setLastTestResult(`Test alert sent for ${selectedError}`);

    // Update summary after a short delay to capture the new alert
    setTimeout(() => {
      setAlertSummary(getAlertSummary());
    }, 100);
  };

  const handleToggleAlerting = () => {
    const newState = !alertsEnabled;
    setAlertingEnabled(newState);
    setAlertsEnabled(newState);
    setLastTestResult(`Alerting ${newState ? 'enabled' : 'disabled'}`);
  };

  const handleClearAlerts = () => {
    // Clear alert history (would need to add this method to ErrorHandlingService)
    errorHandlingService.clearErrorLog();
    setAlertSummary(getAlertSummary());
    setLastTestResult('Alert history cleared');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Quote Alert System Status
          </CardTitle>
          <CardDescription>Test and monitor the quote calculation alert system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Alerting Status:</span>
              <Badge variant={alertsEnabled ? 'default' : 'secondary'}>
                {alertsEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <Button
              onClick={handleToggleAlerting}
              variant={alertsEnabled ? 'outline' : 'default'}
              size="sm"
            >
              {alertsEnabled ? 'Disable' : 'Enable'} Alerting
            </Button>
          </div>

          {/* Alert Summary */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-2xl font-bold">{alertSummary.totalAlerts}</div>
              <div className="text-xs text-muted-foreground">Total Alerts</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{alertSummary.criticalAlerts}</div>
              <div className="text-xs text-muted-foreground">Critical (24h)</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{alertSummary.warningAlerts}</div>
              <div className="text-xs text-muted-foreground">Warnings (24h)</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {alertSummary.recentAlerts.length}
              </div>
              <div className="text-xs text-muted-foreground">Recent Alerts</div>
            </div>
          </div>

          {/* Top Alert Codes */}
          {alertSummary.topAlertCodes.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Top Alert Codes</h4>
              <div className="space-y-2">
                {alertSummary.topAlertCodes.map(({ code, count }) => (
                  <div key={code} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs">{code}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Tester */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Test Alert System
          </CardTitle>
          <CardDescription>Trigger test alerts to verify the alerting mechanism</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Error Code</label>
              <Select
                value={selectedError}
                onValueChange={(value) => setSelectedError(value as QuoteCalculationErrorCode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem disabled className="font-semibold">
                    Critical Errors
                  </SelectItem>
                  {criticalErrors.map((error) => (
                    <SelectItem key={error} value={error}>
                      <span className="flex items-center gap-2">
                        <Badge variant="destructive" className="w-2 h-2 p-0" />
                        {error}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem disabled className="font-semibold">
                    Warning Errors
                  </SelectItem>
                  {warningErrors.map((error) => (
                    <SelectItem key={error} value={error}>
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary" className="w-2 h-2 p-0" />
                        {error}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleTestAlert} className="flex-1">
                Send Test Alert
              </Button>
              <Button onClick={handleClearAlerts} variant="outline">
                Clear History
              </Button>
            </div>

            {lastTestResult && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{lastTestResult}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      {alertSummary.recentAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Recent Alerts
            </CardTitle>
            <CardDescription>Last 10 alerts from the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertSummary.recentAlerts.map((alert, index) => (
                <div
                  key={alert.id || index}
                  className="flex items-start justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(alert.severity)}>{alert.severity}</Badge>
                      <span className="font-mono text-xs">{alert.errorCode}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Count: {alert.errorCount}</span>
                      <span>Window: {alert.timeWindow}</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
