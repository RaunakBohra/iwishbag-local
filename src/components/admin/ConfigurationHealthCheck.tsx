import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import {
  Settings,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  RefreshCw,
  Shield,
  CreditCard,
  Mail,
  Database,
  Cloud,
  Zap,
  TrendingUp
} from 'lucide-react';
import { environmentConfigService, type ConfigurationStatus, type EnvironmentCheck } from '@/services/EnvironmentConfigurationService';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ConfigurationHealthCheckProps {
  compact?: boolean;
  showOnlyIssues?: boolean;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'database': return <Database className="w-4 h-4" />;
    case 'payment': return <CreditCard className="w-4 h-4" />;
    case 'email': return <Mail className="w-4 h-4" />;
    case 'storage': return <Cloud className="w-4 h-4" />;
    case 'security': return <Shield className="w-4 h-4" />;
    case 'api': return <Zap className="w-4 h-4" />;
    default: return <Settings className="w-4 h-4" />;
  }
};

const getCategoryColor = (status: 'healthy' | 'partial' | 'critical') => {
  switch (status) {
    case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
    case 'partial': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
  }
};

export const ConfigurationHealthCheck: React.FC<ConfigurationHealthCheckProps> = ({
  compact = false,
  showOnlyIssues = false
}) => {
  const [configStatus, setConfigStatus] = useState<ConfigurationStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    refreshStatus();
  }, []);

  const refreshStatus = async () => {
    const status = environmentConfigService.checkConfiguration();
    setConfigStatus(status);
  };

  const copyConfigurationInstructions = (missing: EnvironmentCheck[]) => {
    const instructions = environmentConfigService.generateConfigurationInstructions(missing);
    navigator.clipboard.writeText(instructions);
    toast({
      title: "Configuration copied",
      description: "Environment variable instructions copied to clipboard.",
    });
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  if (!configStatus) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
          <div className="text-sm text-gray-600">Checking configuration...</div>
        </CardContent>
      </Card>
    );
  }

  // Show only issues if requested and there are no issues
  if (showOnlyIssues && configStatus.overall === 'healthy') {
    return null;
  }

  const getOverallStatusInfo = () => {
    switch (configStatus.overall) {
      case 'healthy':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          title: "Configuration Healthy",
          description: "All required configurations are properly set up.",
          color: "border-green-200 bg-green-50/20"
        };
      case 'partial':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
          title: "Partial Configuration",
          description: `${configStatus.missingOptional.length} optional configurations missing.`,
          color: "border-yellow-200 bg-yellow-50/20"
        };
      case 'critical':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          title: "Critical Issues",
          description: `${configStatus.missingRequired.length} required configurations missing.`,
          color: "border-red-200 bg-red-50/20"
        };
    }
  };

  const overallStatus = getOverallStatusInfo();

  return (
    <Card className={cn("shadow-sm overflow-hidden", overallStatus.color)}>
      {/* Status Indicator */}
      <div className={cn(
        "h-1 w-full",
        configStatus.overall === 'healthy' && "bg-gradient-to-r from-green-500 to-emerald-500",
        configStatus.overall === 'partial' && "bg-gradient-to-r from-yellow-500 to-orange-500", 
        configStatus.overall === 'critical' && "bg-gradient-to-r from-red-500 to-pink-500"
      )} />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {overallStatus.icon}
            <div>
              <CardTitle className="text-base">{overallStatus.title}</CardTitle>
              <div className="text-sm text-gray-600 mt-1">
                {overallStatus.description}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshStatus}
              className="h-7 px-2"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            {!compact && (
              <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Category Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {Object.entries(configStatus.categories).map(([category, info]) => (
            <div 
              key={category}
              className={cn(
                "p-2 rounded-lg border text-center cursor-pointer hover:opacity-80 transition-opacity",
                getCategoryColor(info.status)
              )}
              onClick={() => toggleCategory(category)}
            >
              <div className="flex items-center justify-center mb-1">
                {getCategoryIcon(category)}
              </div>
              <div className="text-xs font-medium capitalize">{category}</div>
              <div className="text-xs opacity-75">
                {info.healthy}/{info.total}
              </div>
            </div>
          ))}
        </div>


        {/* Critical Issues Alert */}
        {configStatus.missingRequired.length > 0 && (
          <Alert className="border-red-200 bg-red-50 mb-4">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-medium mb-2">Critical Configuration Missing</div>
              <div className="space-y-1 text-sm">
                {configStatus.missingRequired.map(check => (
                  <div key={check.key} className="flex items-center justify-between">
                    <span>• {check.name}</span>
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyConfigurationInstructions(configStatus.missingRequired)}
                className="mt-3 h-7 text-xs border-red-300 text-red-700 hover:bg-red-100"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Fix Instructions
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Detailed Configuration (Collapsible) */}
        {!compact && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent>
              <Separator className="mb-4" />
              
              {/* Production Readiness */}
              {(() => {
                const readiness = environmentConfigService.isProductionReady();
                if (!readiness.ready) {
                  return (
                    <Alert className="border-orange-200 bg-orange-50 mb-4">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <div className="font-medium mb-2">Not Production Ready</div>
                        <div className="space-y-1 text-sm">
                          {readiness.blockers.map((blocker, index) => (
                            <div key={index}>• {blocker}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  );
                }
                return null;
              })()}

              {/* Category Details */}
              {Object.entries(configStatus.categories).map(([category, info]) => (
                expandedCategories.has(category) && (
                  <div key={category} className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      {getCategoryIcon(category)}
                      <span className="font-medium capitalize text-sm">{category} Configuration</span>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getCategoryColor(info.status))}
                      >
                        {info.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 ml-6">
                      {configStatus.checks
                        .filter(check => check.category === category)
                        .map(check => (
                          <div key={check.key} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              {check.hasValue ? (
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              ) : (
                                <AlertCircle className={cn(
                                  "w-3 h-3",
                                  check.required ? "text-red-600" : "text-yellow-600"
                                )} />
                              )}
                              <span className={cn(
                                check.hasValue ? "text-gray-900" : "text-gray-600"
                              )}>
                                {check.name}
                              </span>
                            </div>
                            <Badge 
                              variant={check.required ? "destructive" : "secondary"} 
                              className="text-xs"
                            >
                              {check.required ? "Required" : "Optional"}
                            </Badge>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )
              ))}

              {/* Configuration Instructions */}
              {(configStatus.missingRequired.length > 0 || configStatus.missingOptional.length > 0) && (
                <div className="bg-gray-50 rounded-lg p-3 mt-4">
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    Configuration Help
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    Add missing environment variables to your .env file to enable full functionality.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyConfigurationInstructions([
                      ...configStatus.missingRequired, 
                      ...configStatus.missingOptional
                    ])}
                    className="h-7 text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy All Instructions
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
};