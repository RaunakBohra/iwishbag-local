/**
 * HSN System Settings Component
 * Configuration interface for HSN tax system parameters
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Settings,
  Database,
  Zap,
  Shield,
  Globe,
  AlertTriangle,
  CheckCircle,
  Save,
  RotateCcw,
  Key,
  Clock,
  Target,
} from 'lucide-react';

interface SystemSettings {
  classification: {
    enabled: boolean;
    confidenceThreshold: number;
    autoRetryEnabled: boolean;
    maxRetries: number;
    fallbackToManual: boolean;
  };
  weightDetection: {
    enabled: boolean;
    confidenceThreshold: number;
    defaultWeight: number;
    useHSNAverages: boolean;
    enableSpecExtraction: boolean;
  };
  taxCalculation: {
    enableMinimumValuation: boolean;
    defaultValuationMethod: 'cost_price' | 'minimum_valuation' | 'higher_of_both';
    compoundTaxes: boolean;
    roundingMethod: 'none' | 'nearest_cent' | 'up' | 'down';
  };
  caching: {
    hsnCacheDuration: number;
    classificationCacheDuration: number;
    weightCacheDuration: number;
    taxCacheDuration: number;
    enableDistributedCache: boolean;
  };
  apiIntegration: {
    enableGovernmentAPIs: boolean;
    retryAttempts: number;
    timeoutMs: number;
    fallbackToLocal: boolean;
    enableRateLimiting: boolean;
  };
  monitoring: {
    enableDetailedLogging: boolean;
    enablePerformanceMetrics: boolean;
    enableErrorTracking: boolean;
    alertThresholds: {
      errorRate: number;
      processingTime: number;
      confidenceScore: number;
    };
  };
  security: {
    enableApiKeyEncryption: boolean;
    sessionTimeout: number;
    enableAuditLogging: boolean;
    enableRoleBasedAccess: boolean;
  };
}

export const HSNSystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    classification: {
      enabled: true,
      confidenceThreshold: 0.7,
      autoRetryEnabled: true,
      maxRetries: 3,
      fallbackToManual: true,
    },
    weightDetection: {
      enabled: true,
      confidenceThreshold: 0.6,
      defaultWeight: 0.5,
      useHSNAverages: true,
      enableSpecExtraction: true,
    },
    taxCalculation: {
      enableMinimumValuation: true,
      defaultValuationMethod: 'higher_of_both',
      compoundTaxes: true,
      roundingMethod: 'nearest_cent',
    },
    caching: {
      hsnCacheDuration: 24 * 60 * 60 * 1000, // 24 hours
      classificationCacheDuration: 6 * 60 * 60 * 1000, // 6 hours
      weightCacheDuration: 6 * 60 * 60 * 1000, // 6 hours
      taxCacheDuration: 30 * 60 * 1000, // 30 minutes
      enableDistributedCache: false,
    },
    apiIntegration: {
      enableGovernmentAPIs: true,
      retryAttempts: 3,
      timeoutMs: 10000,
      fallbackToLocal: true,
      enableRateLimiting: true,
    },
    monitoring: {
      enableDetailedLogging: true,
      enablePerformanceMetrics: true,
      enableErrorTracking: true,
      alertThresholds: {
        errorRate: 5.0,
        processingTime: 5000,
        confidenceScore: 0.5,
      },
    },
    security: {
      enableApiKeyEncryption: true,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      enableAuditLogging: true,
      enableRoleBasedAccess: true,
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        // In a real implementation, load from API
        // For now, using default settings
        setLoading(false);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSettingChange = (section: keyof SystemSettings, key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleNestedSettingChange = (
    section: keyof SystemSettings,
    nestedKey: string,
    key: string,
    value: any,
  ) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nestedKey]: {
          ...(prev[section] as any)[nestedKey],
          [key]: value,
        },
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // In a real implementation, save to API
      console.log('Saving settings:', settings);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      setHasChanges(false);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      // Reset to default values
      setHasChanges(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
          <p className="text-gray-600">Configure HSN tax system parameters and behavior</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unsaved Changes</AlertTitle>
          <AlertDescription>
            You have unsaved changes. Make sure to save your settings before leaving this page.
          </AlertDescription>
        </Alert>
      )}

      {/* Classification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Product Classification
          </CardTitle>
          <CardDescription>
            Configure automatic product classification and HSN code detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="classification-enabled">Enable Auto Classification</Label>
              <p className="text-sm text-gray-600">
                Automatically classify products and assign HSN codes
              </p>
            </div>
            <Switch
              id="classification-enabled"
              checked={settings.classification.enabled}
              onCheckedChange={(checked) =>
                handleSettingChange('classification', 'enabled', checked)
              }
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="confidence-threshold">Confidence Threshold</Label>
              <Input
                id="confidence-threshold"
                type="number"
                min="0.1"
                max="1.0"
                step="0.1"
                value={settings.classification.confidenceThreshold}
                onChange={(e) =>
                  handleSettingChange(
                    'classification',
                    'confidenceThreshold',
                    parseFloat(e.target.value),
                  )
                }
              />
              <p className="text-xs text-gray-600 mt-1">
                Minimum confidence required for auto-classification (0.0 - 1.0)
              </p>
            </div>

            <div>
              <Label htmlFor="max-retries">Max Retry Attempts</Label>
              <Input
                id="max-retries"
                type="number"
                min="0"
                max="10"
                value={settings.classification.maxRetries}
                onChange={(e) =>
                  handleSettingChange('classification', 'maxRetries', parseInt(e.target.value))
                }
              />
              <p className="text-xs text-gray-600 mt-1">
                Number of retry attempts for failed classifications
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="fallback-manual">Fallback to Manual Review</Label>
              <p className="text-sm text-gray-600">Flag low-confidence items for manual review</p>
            </div>
            <Switch
              id="fallback-manual"
              checked={settings.classification.fallbackToManual}
              onCheckedChange={(checked) =>
                handleSettingChange('classification', 'fallbackToManual', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Weight Detection Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Weight Detection
          </CardTitle>
          <CardDescription>Configure automatic weight detection and estimation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weight-enabled">Enable Weight Detection</Label>
              <p className="text-sm text-gray-600">
                Automatically detect product weights from specifications
              </p>
            </div>
            <Switch
              id="weight-enabled"
              checked={settings.weightDetection.enabled}
              onCheckedChange={(checked) =>
                handleSettingChange('weightDetection', 'enabled', checked)
              }
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weight-confidence">Confidence Threshold</Label>
              <Input
                id="weight-confidence"
                type="number"
                min="0.1"
                max="1.0"
                step="0.1"
                value={settings.weightDetection.confidenceThreshold}
                onChange={(e) =>
                  handleSettingChange(
                    'weightDetection',
                    'confidenceThreshold',
                    parseFloat(e.target.value),
                  )
                }
              />
            </div>

            <div>
              <Label htmlFor="default-weight">Default Weight (kg)</Label>
              <Input
                id="default-weight"
                type="number"
                min="0.01"
                step="0.01"
                value={settings.weightDetection.defaultWeight}
                onChange={(e) =>
                  handleSettingChange(
                    'weightDetection',
                    'defaultWeight',
                    parseFloat(e.target.value),
                  )
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="use-hsn-averages">Use HSN Category Averages</Label>
              <p className="text-sm text-gray-600">
                Use category-based weight averages when detection fails
              </p>
            </div>
            <Switch
              id="use-hsn-averages"
              checked={settings.weightDetection.useHSNAverages}
              onCheckedChange={(checked) =>
                handleSettingChange('weightDetection', 'useHSNAverages', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="spec-extraction">Enable Spec Extraction</Label>
              <p className="text-sm text-gray-600">
                Extract weight from product specification text
              </p>
            </div>
            <Switch
              id="spec-extraction"
              checked={settings.weightDetection.enableSpecExtraction}
              onCheckedChange={(checked) =>
                handleSettingChange('weightDetection', 'enableSpecExtraction', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Tax Calculation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Tax Calculation
          </CardTitle>
          <CardDescription>Configure tax calculation methods and rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="minimum-valuation">Enable Minimum Valuation</Label>
              <p className="text-sm text-gray-600">
                Apply minimum valuation rules (e.g., Nepal kurta example)
              </p>
            </div>
            <Switch
              id="minimum-valuation"
              checked={settings.taxCalculation.enableMinimumValuation}
              onCheckedChange={(checked) =>
                handleSettingChange('taxCalculation', 'enableMinimumValuation', checked)
              }
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="valuation-method">Default Valuation Method</Label>
              <Select
                value={settings.taxCalculation.defaultValuationMethod}
                onValueChange={(value) =>
                  handleSettingChange('taxCalculation', 'defaultValuationMethod', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cost_price">Cost Price Only</SelectItem>
                  <SelectItem value="minimum_valuation">Minimum Valuation Only</SelectItem>
                  <SelectItem value="higher_of_both">Higher of Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rounding-method">Rounding Method</Label>
              <Select
                value={settings.taxCalculation.roundingMethod}
                onValueChange={(value) =>
                  handleSettingChange('taxCalculation', 'roundingMethod', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Rounding</SelectItem>
                  <SelectItem value="nearest_cent">Nearest Cent</SelectItem>
                  <SelectItem value="up">Round Up</SelectItem>
                  <SelectItem value="down">Round Down</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="compound-taxes">Compound Taxes</Label>
              <p className="text-sm text-gray-600">
                Calculate local taxes on customs-inclusive value
              </p>
            </div>
            <Switch
              id="compound-taxes"
              checked={settings.taxCalculation.compoundTaxes}
              onCheckedChange={(checked) =>
                handleSettingChange('taxCalculation', 'compoundTaxes', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Caching Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Caching & Performance
          </CardTitle>
          <CardDescription>Configure caching durations and performance settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hsn-cache">HSN Cache Duration (hours)</Label>
              <Input
                id="hsn-cache"
                type="number"
                min="1"
                max="168"
                value={settings.caching.hsnCacheDuration / (60 * 60 * 1000)}
                onChange={(e) =>
                  handleSettingChange(
                    'caching',
                    'hsnCacheDuration',
                    parseInt(e.target.value) * 60 * 60 * 1000,
                  )
                }
              />
            </div>

            <div>
              <Label htmlFor="classification-cache">Classification Cache (hours)</Label>
              <Input
                id="classification-cache"
                type="number"
                min="1"
                max="24"
                value={settings.caching.classificationCacheDuration / (60 * 60 * 1000)}
                onChange={(e) =>
                  handleSettingChange(
                    'caching',
                    'classificationCacheDuration',
                    parseInt(e.target.value) * 60 * 60 * 1000,
                  )
                }
              />
            </div>

            <div>
              <Label htmlFor="weight-cache">Weight Cache (hours)</Label>
              <Input
                id="weight-cache"
                type="number"
                min="1"
                max="24"
                value={settings.caching.weightCacheDuration / (60 * 60 * 1000)}
                onChange={(e) =>
                  handleSettingChange(
                    'caching',
                    'weightCacheDuration',
                    parseInt(e.target.value) * 60 * 60 * 1000,
                  )
                }
              />
            </div>

            <div>
              <Label htmlFor="tax-cache">Tax Cache (minutes)</Label>
              <Input
                id="tax-cache"
                type="number"
                min="5"
                max="1440"
                value={settings.caching.taxCacheDuration / (60 * 1000)}
                onChange={(e) =>
                  handleSettingChange(
                    'caching',
                    'taxCacheDuration',
                    parseInt(e.target.value) * 60 * 1000,
                  )
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="distributed-cache">Enable Distributed Cache</Label>
              <p className="text-sm text-gray-600">
                Use distributed caching for improved scalability
              </p>
            </div>
            <Switch
              id="distributed-cache"
              checked={settings.caching.enableDistributedCache}
              onCheckedChange={(checked) =>
                handleSettingChange('caching', 'enableDistributedCache', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* API Integration Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            API Integration
          </CardTitle>
          <CardDescription>Configure government API integration settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable-govt-apis">Enable Government APIs</Label>
              <p className="text-sm text-gray-600">
                Use live government APIs for real-time tax rates
              </p>
            </div>
            <Switch
              id="enable-govt-apis"
              checked={settings.apiIntegration.enableGovernmentAPIs}
              onCheckedChange={(checked) =>
                handleSettingChange('apiIntegration', 'enableGovernmentAPIs', checked)
              }
            />
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="retry-attempts">Retry Attempts</Label>
              <Input
                id="retry-attempts"
                type="number"
                min="0"
                max="10"
                value={settings.apiIntegration.retryAttempts}
                onChange={(e) =>
                  handleSettingChange('apiIntegration', 'retryAttempts', parseInt(e.target.value))
                }
              />
            </div>

            <div>
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                min="1000"
                max="30000"
                step="1000"
                value={settings.apiIntegration.timeoutMs}
                onChange={(e) =>
                  handleSettingChange('apiIntegration', 'timeoutMs', parseInt(e.target.value))
                }
              />
            </div>

            <div className="flex items-center justify-center pt-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="rate-limiting"
                  checked={settings.apiIntegration.enableRateLimiting}
                  onCheckedChange={(checked) =>
                    handleSettingChange('apiIntegration', 'enableRateLimiting', checked)
                  }
                />
                <Label htmlFor="rate-limiting">Rate Limiting</Label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="fallback-local">Fallback to Local Data</Label>
              <p className="text-sm text-gray-600">Use local database when API calls fail</p>
            </div>
            <Switch
              id="fallback-local"
              checked={settings.apiIntegration.fallbackToLocal}
              onCheckedChange={(checked) =>
                handleSettingChange('apiIntegration', 'fallbackToLocal', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Monitoring & Alerts
          </CardTitle>
          <CardDescription>Configure system monitoring and alert thresholds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="detailed-logging">Detailed Logging</Label>
                <p className="text-xs text-gray-600">Enable verbose logging</p>
              </div>
              <Switch
                id="detailed-logging"
                checked={settings.monitoring.enableDetailedLogging}
                onCheckedChange={(checked) =>
                  handleSettingChange('monitoring', 'enableDetailedLogging', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="performance-metrics">Performance Metrics</Label>
                <p className="text-xs text-gray-600">Track performance data</p>
              </div>
              <Switch
                id="performance-metrics"
                checked={settings.monitoring.enablePerformanceMetrics}
                onCheckedChange={(checked) =>
                  handleSettingChange('monitoring', 'enablePerformanceMetrics', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="error-tracking">Error Tracking</Label>
                <p className="text-xs text-gray-600">Monitor system errors</p>
              </div>
              <Switch
                id="error-tracking"
                checked={settings.monitoring.enableErrorTracking}
                onCheckedChange={(checked) =>
                  handleSettingChange('monitoring', 'enableErrorTracking', checked)
                }
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium">Alert Thresholds</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="error-rate-threshold">Error Rate (%)</Label>
                <Input
                  id="error-rate-threshold"
                  type="number"
                  min="0.1"
                  max="50"
                  step="0.1"
                  value={settings.monitoring.alertThresholds.errorRate}
                  onChange={(e) =>
                    handleNestedSettingChange(
                      'monitoring',
                      'alertThresholds',
                      'errorRate',
                      parseFloat(e.target.value),
                    )
                  }
                />
              </div>

              <div>
                <Label htmlFor="processing-time-threshold">Processing Time (ms)</Label>
                <Input
                  id="processing-time-threshold"
                  type="number"
                  min="1000"
                  max="30000"
                  step="100"
                  value={settings.monitoring.alertThresholds.processingTime}
                  onChange={(e) =>
                    handleNestedSettingChange(
                      'monitoring',
                      'alertThresholds',
                      'processingTime',
                      parseInt(e.target.value),
                    )
                  }
                />
              </div>

              <div>
                <Label htmlFor="confidence-threshold-alert">Confidence Threshold</Label>
                <Input
                  id="confidence-threshold-alert"
                  type="number"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={settings.monitoring.alertThresholds.confidenceScore}
                  onChange={(e) =>
                    handleNestedSettingChange(
                      'monitoring',
                      'alertThresholds',
                      'confidenceScore',
                      parseFloat(e.target.value),
                    )
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Access
          </CardTitle>
          <CardDescription>Configure security settings and access controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="api-key-encryption">API Key Encryption</Label>
                <p className="text-sm text-gray-600">Encrypt stored API keys</p>
              </div>
              <Switch
                id="api-key-encryption"
                checked={settings.security.enableApiKeyEncryption}
                onCheckedChange={(checked) =>
                  handleSettingChange('security', 'enableApiKeyEncryption', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="audit-logging">Audit Logging</Label>
                <p className="text-sm text-gray-600">Log all admin actions</p>
              </div>
              <Switch
                id="audit-logging"
                checked={settings.security.enableAuditLogging}
                onCheckedChange={(checked) =>
                  handleSettingChange('security', 'enableAuditLogging', checked)
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="role-based-access">Role-Based Access</Label>
                <p className="text-sm text-gray-600">Enable role-based permissions</p>
              </div>
              <Switch
                id="role-based-access"
                checked={settings.security.enableRoleBasedAccess}
                onCheckedChange={(checked) =>
                  handleSettingChange('security', 'enableRoleBasedAccess', checked)
                }
              />
            </div>

            <div>
              <Label htmlFor="session-timeout">Session Timeout (hours)</Label>
              <Input
                id="session-timeout"
                type="number"
                min="1"
                max="168"
                value={settings.security.sessionTimeout / (60 * 60 * 1000)}
                onChange={(e) =>
                  handleSettingChange(
                    'security',
                    'sessionTimeout',
                    parseInt(e.target.value) * 60 * 60 * 1000,
                  )
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save confirmation */}
      {hasChanges && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800">You have unsaved changes</p>
                  <p className="text-sm text-orange-700">
                    Save your settings to apply the changes to the system.
                  </p>
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save All Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
