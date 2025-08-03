import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Settings,
  Gauge,
  Target,
  Clock,
  Database,
  Search,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface IntelligenceConfig {
  // Confidence Thresholds
  minConfidenceForAutoSuggestion: number;
  minConfidenceForWeightEstimation: number;
  minConfidenceForCategoryMatch: number;
  
  // Search Settings
  maxSearchResults: number;
  searchTimeout: number;
  enableFuzzySearch: boolean;
  fuzzySearchTolerance: number;
  
  // Weight Estimation
  weightVarianceFactor: number;
  enableBulkWeightEstimation: boolean;
  weightEstimationFallback: boolean;
  
  // Performance Settings
  cacheTimeout: number;
  enableResultCaching: boolean;
  maxCacheSize: number;
  enableAsyncProcessing: boolean;
  
  // AI Enhancement
  enableSmartSuggestions: boolean;
  enableContextualLearning: boolean;
  autoUpdateConfidenceScores: boolean;
  
  // System Settings
  enableSystemWideAI: boolean;
  enablePerformanceLogging: boolean;
  maintenanceMode: boolean;
}

const IntelligenceSettings: React.FC = () => {
  const [config, setConfig] = useState<IntelligenceConfig>({
    // Default values
    minConfidenceForAutoSuggestion: 0.7,
    minConfidenceForWeightEstimation: 0.6,
    minConfidenceForCategoryMatch: 0.8,
    
    maxSearchResults: 10,
    searchTimeout: 5000,
    enableFuzzySearch: true,
    fuzzySearchTolerance: 0.8,
    
    weightVarianceFactor: 1.2,
    enableBulkWeightEstimation: true,
    weightEstimationFallback: true,
    
    cacheTimeout: 900, // 15 minutes
    enableResultCaching: true,
    maxCacheSize: 1000,
    enableAsyncProcessing: true,
    
    enableSmartSuggestions: true,
    enableContextualLearning: false,
    autoUpdateConfidenceScores: false,
    
    enableSystemWideAI: true,
    enablePerformanceLogging: true,
    maintenanceMode: false,
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would load from the database
      // For now, we'll use localStorage or default values
      const saved = localStorage.getItem('intelligenceSettings');
      if (saved) {
        setConfig(JSON.parse(saved));
      }
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error Loading Settings",
        description: "Failed to load intelligence settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would save to the database
      localStorage.setItem('intelligenceSettings', JSON.stringify(config));
      
      toast({
        title: "Settings Saved",
        description: "Intelligence settings updated successfully",
      });
      
      setHasChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error Saving Settings",
        description: "Failed to save intelligence settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      setConfig({
        minConfidenceForAutoSuggestion: 0.7,
        minConfidenceForWeightEstimation: 0.6,
        minConfidenceForCategoryMatch: 0.8,
        
        maxSearchResults: 10,
        searchTimeout: 5000,
        enableFuzzySearch: true,
        fuzzySearchTolerance: 0.8,
        
        weightVarianceFactor: 1.2,
        enableBulkWeightEstimation: true,
        weightEstimationFallback: true,
        
        cacheTimeout: 900,
        enableResultCaching: true,
        maxCacheSize: 1000,
        enableAsyncProcessing: true,
        
        enableSmartSuggestions: true,
        enableContextualLearning: false,
        autoUpdateConfidenceScores: false,
        
        enableSystemWideAI: true,
        enablePerformanceLogging: true,
        maintenanceMode: false,
      });
      setHasChanges(true);
    }
  };

  const updateConfig = (key: keyof IntelligenceConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const getSystemStatus = () => {
    if (config.maintenanceMode) {
      return { status: 'maintenance', message: 'System in maintenance mode', color: 'orange' };
    }
    if (!config.enableSystemWideAI) {
      return { status: 'disabled', message: 'AI features disabled', color: 'red' };
    }
    return { status: 'active', message: 'AI system operational', color: 'green' };
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            Intelligence Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Configure AI parameters and system behavior
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadSettings} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload
          </Button>
          <Button onClick={resetToDefaults} variant="outline" size="sm">
            Reset Defaults
          </Button>
          <Button 
            onClick={saveSettings} 
            disabled={!hasChanges || loading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {systemStatus.status === 'active' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {systemStatus.status === 'maintenance' && <AlertCircle className="h-5 w-5 text-orange-600" />}
              {systemStatus.status === 'disabled' && <AlertCircle className="h-5 w-5 text-red-600" />}
              
              <div>
                <p className="font-medium">{systemStatus.message}</p>
                {lastSaved && (
                  <p className="text-sm text-gray-600">
                    Last updated: {lastSaved.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            
            <Badge 
              variant="outline"
              className={`bg-${systemStatus.color}-100 text-${systemStatus.color}-800 border-${systemStatus.color}-200`}
            >
              {systemStatus.status.toUpperCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <p className="text-sm font-medium text-orange-800">
                  You have unsaved changes
                </p>
              </div>
              <Button onClick={saveSettings} size="sm" className="bg-orange-600 hover:bg-orange-700">
                Save Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Confidence Thresholds
            </CardTitle>
            <CardDescription>
              Set minimum confidence levels for AI suggestions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Auto-Suggestion Threshold: {(config.minConfidenceForAutoSuggestion * 100).toFixed(0)}%</Label>
              <Slider
                value={[config.minConfidenceForAutoSuggestion]}
                onValueChange={([value]) => updateConfig('minConfidenceForAutoSuggestion', value)}
                max={1}
                min={0.1}
                step={0.05}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum confidence to show automatic suggestions
              </p>
            </div>

            <div>
              <Label>Weight Estimation Threshold: {(config.minConfidenceForWeightEstimation * 100).toFixed(0)}%</Label>
              <Slider
                value={[config.minConfidenceForWeightEstimation]}
                onValueChange={([value]) => updateConfig('minConfidenceForWeightEstimation', value)}
                max={1}
                min={0.1}
                step={0.05}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum confidence for weight suggestions
              </p>
            </div>

            <div>
              <Label>Category Match Threshold: {(config.minConfidenceForCategoryMatch * 100).toFixed(0)}%</Label>
              <Slider
                value={[config.minConfidenceForCategoryMatch]}
                onValueChange={([value]) => updateConfig('minConfidenceForCategoryMatch', value)}
                max={1}
                min={0.1}
                step={0.05}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum confidence for category matching
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Search Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-green-600" />
              Search Configuration
            </CardTitle>
            <CardDescription>
              Configure search behavior and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="maxResults">Maximum Search Results</Label>
              <Input
                id="maxResults"
                type="number"
                min="1"
                max="50"
                value={config.maxSearchResults}
                onChange={(e) => updateConfig('maxSearchResults', parseInt(e.target.value) || 10)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="searchTimeout">Search Timeout (ms)</Label>
              <Input
                id="searchTimeout"
                type="number"
                min="1000"
                max="30000"
                value={config.searchTimeout}
                onChange={(e) => updateConfig('searchTimeout', parseInt(e.target.value) || 5000)}
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Fuzzy Search</Label>
                <p className="text-xs text-gray-500">Allow approximate matching</p>
              </div>
              <Switch
                checked={config.enableFuzzySearch}
                onCheckedChange={(checked) => updateConfig('enableFuzzySearch', checked)}
              />
            </div>

            {config.enableFuzzySearch && (
              <div>
                <Label>Fuzzy Search Tolerance: {(config.fuzzySearchTolerance * 100).toFixed(0)}%</Label>
                <Slider
                  value={[config.fuzzySearchTolerance]}
                  onValueChange={([value]) => updateConfig('fuzzySearchTolerance', value)}
                  max={1}
                  min={0.1}
                  step={0.05}
                  className="mt-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              Performance Settings
            </CardTitle>
            <CardDescription>
              Optimize system performance and caching
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Result Caching</Label>
                <p className="text-xs text-gray-500">Cache search results for faster response</p>
              </div>
              <Switch
                checked={config.enableResultCaching}
                onCheckedChange={(checked) => updateConfig('enableResultCaching', checked)}
              />
            </div>

            {config.enableResultCaching && (
              <>
                <div>
                  <Label htmlFor="cacheTimeout">Cache Timeout (seconds)</Label>
                  <Input
                    id="cacheTimeout"
                    type="number"
                    min="60"
                    max="3600"
                    value={config.cacheTimeout}
                    onChange={(e) => updateConfig('cacheTimeout', parseInt(e.target.value) || 900)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="maxCacheSize">Maximum Cache Size (entries)</Label>
                  <Input
                    id="maxCacheSize"
                    type="number"
                    min="100"
                    max="10000"
                    value={config.maxCacheSize}
                    onChange={(e) => updateConfig('maxCacheSize', parseInt(e.target.value) || 1000)}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Async Processing</Label>
                <p className="text-xs text-gray-500">Process requests asynchronously</p>
              </div>
              <Switch
                checked={config.enableAsyncProcessing}
                onCheckedChange={(checked) => updateConfig('enableAsyncProcessing', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* AI Enhancement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              AI Enhancement
            </CardTitle>
            <CardDescription>
              Advanced AI features and learning capabilities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Smart Suggestions</Label>
                <p className="text-xs text-gray-500">Enable AI-powered suggestions</p>
              </div>
              <Switch
                checked={config.enableSmartSuggestions}
                onCheckedChange={(checked) => updateConfig('enableSmartSuggestions', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Contextual Learning</Label>
                <p className="text-xs text-gray-500">Learn from user interactions (experimental)</p>
              </div>
              <Switch
                checked={config.enableContextualLearning}
                onCheckedChange={(checked) => updateConfig('enableContextualLearning', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Update Confidence Scores</Label>
                <p className="text-xs text-gray-500">Automatically adjust scores based on usage</p>
              </div>
              <Switch
                checked={config.autoUpdateConfidenceScores}
                onCheckedChange={(checked) => updateConfig('autoUpdateConfidenceScores', checked)}
              />
            </div>

            <div>
              <Label>Weight Variance Factor: {config.weightVarianceFactor.toFixed(1)}x</Label>
              <Slider
                value={[config.weightVarianceFactor]}
                onValueChange={([value]) => updateConfig('weightVarianceFactor', value)}
                max={3}
                min={1}
                step={0.1}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Allowable variance in weight estimations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            System Controls
          </CardTitle>
          <CardDescription>
            Global system settings and maintenance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>System-Wide AI</Label>
                <p className="text-xs text-gray-500">Enable/disable all AI features</p>
              </div>
              <Switch
                checked={config.enableSystemWideAI}
                onCheckedChange={(checked) => updateConfig('enableSystemWideAI', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Performance Logging</Label>
                <p className="text-xs text-gray-500">Log system performance metrics</p>
              </div>
              <Switch
                checked={config.enablePerformanceLogging}
                onCheckedChange={(checked) => updateConfig('enablePerformanceLogging', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-xs text-gray-500">Disable AI for maintenance</p>
              </div>
              <Switch
                checked={config.maintenanceMode}
                onCheckedChange={(checked) => updateConfig('maintenanceMode', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntelligenceSettings;