/**
 * Unified Configuration Hook
 * Provides easy access to all application configurations through the unified system
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { unifiedConfigService } from '@/services/UnifiedConfigurationService';
import type {
  ConfigCategory,
  CountryConfig,
  CalculationConfig,
  SystemConfig,
  TemplateConfig,
  GatewayConfig,
} from '@/services/UnifiedConfigurationService';

// ============================================================================
// Core Configuration Hook
// ============================================================================

export function useUnifiedConfig() {
  const queryClient = useQueryClient();

  // ============================================================================
  // Query Keys
  // ============================================================================

  const QUERY_KEYS = {
    countries: ['config', 'countries'],
    country: (code: string) => ['config', 'country', code],
    calculations: ['config', 'calculations'],
    system: ['config', 'system'],
    templates: (type?: string) => ['config', 'templates', type || 'all'],
    template: (key: string) => ['config', 'template', key],
    gateways: (country?: string) => ['config', 'gateways', country || 'all'],
    gateway: (name: string) => ['config', 'gateway', name],
    supportedCurrencies: ['config', 'currencies'],
    supportedCountries: ['config', 'countries', 'list'],
  };

  // ============================================================================
  // Queries - Country Configurations
  // ============================================================================

  const useCountryConfig = (countryCode: string) => {
    return useQuery({
      queryKey: QUERY_KEYS.country(countryCode),
      queryFn: () => unifiedConfigService.getCountryConfig(countryCode),
      staleTime: 30 * 60 * 1000, // 30 minutes - country configs are stable
      enabled: !!countryCode,
    });
  };

  const useAllCountries = () => {
    return useQuery({
      queryKey: QUERY_KEYS.countries,
      queryFn: () => unifiedConfigService.getAllCountryConfigs(),
      staleTime: 30 * 60 * 1000, // 30 minutes
    });
  };

  const useSupportedCountries = () => {
    return useQuery({
      queryKey: QUERY_KEYS.supportedCountries,
      queryFn: () => unifiedConfigService.getSupportedCountries(),
      staleTime: 60 * 60 * 1000, // 1 hour - very stable
    });
  };

  const useSupportedCurrencies = () => {
    return useQuery({
      queryKey: QUERY_KEYS.supportedCurrencies,
      queryFn: () => unifiedConfigService.getSupportedCurrencies(),
      staleTime: 60 * 60 * 1000, // 1 hour - very stable
    });
  };

  // ============================================================================
  // Queries - Calculation Configurations
  // ============================================================================

  const useCalculationDefaults = () => {
    return useQuery({
      queryKey: QUERY_KEYS.calculations,
      queryFn: () => unifiedConfigService.getCalculationDefaults(),
      staleTime: 15 * 60 * 1000, // 15 minutes
    });
  };

  // ============================================================================
  // Queries - System Configurations
  // ============================================================================

  const useSystemConfig = () => {
    return useQuery({
      queryKey: QUERY_KEYS.system,
      queryFn: () => unifiedConfigService.getSystemConfig(),
      staleTime: 5 * 60 * 1000, // 5 minutes - system configs can change more frequently
    });
  };

  const useFeatureFlag = (featureName: string) => {
    return useQuery({
      queryKey: ['config', 'feature', featureName],
      queryFn: () => unifiedConfigService.isFeatureEnabled(featureName),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  const useMaintenanceMode = () => {
    return useQuery({
      queryKey: ['config', 'maintenance'],
      queryFn: async () => {
        const config = await unifiedConfigService.getSystemConfig();
        return config?.maintenance_mode || false;
      },
      staleTime: 1 * 60 * 1000, // 1 minute - maintenance mode needs quick updates
      refetchInterval: 2 * 60 * 1000, // Check every 2 minutes
    });
  };

  // ============================================================================
  // Queries - Template Configurations
  // ============================================================================

  const useTemplates = (type?: 'email' | 'sms' | 'push') => {
    return useQuery({
      queryKey: QUERY_KEYS.templates(type),
      queryFn: () => unifiedConfigService.getTemplates(type),
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  };

  const useTemplate = (templateKey: string) => {
    return useQuery({
      queryKey: QUERY_KEYS.template(templateKey),
      queryFn: () => unifiedConfigService.getTemplate(templateKey),
      staleTime: 10 * 60 * 1000, // 10 minutes
      enabled: !!templateKey,
    });
  };

  // ============================================================================
  // Queries - Gateway Configurations
  // ============================================================================

  const usePaymentGateways = (countryCode?: string) => {
    return useQuery({
      queryKey: QUERY_KEYS.gateways(countryCode),
      queryFn: () => unifiedConfigService.getPaymentGateways(countryCode),
      staleTime: 15 * 60 * 1000, // 15 minutes
    });
  };

  const useGatewayConfig = (gatewayName: string) => {
    return useQuery({
      queryKey: QUERY_KEYS.gateway(gatewayName),
      queryFn: () => unifiedConfigService.getGatewayConfig(gatewayName),
      staleTime: 15 * 60 * 1000, // 15 minutes
      enabled: !!gatewayName,
    });
  };

  // ============================================================================
  // Mutations
  // ============================================================================

  const updateCountryConfigMutation = useMutation({
    mutationFn: ({ countryCode, config }: { countryCode: string; config: CountryConfig }) =>
      unifiedConfigService.setCountryConfig(countryCode, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', 'countries'] });
      toast.success('Country configuration updated successfully');
    },
    onError: (error) => {
      console.error('Error updating country config:', error);
      toast.error('Failed to update country configuration');
    },
  });

  const updateCalculationDefaultsMutation = useMutation({
    mutationFn: (config: Partial<CalculationConfig>) =>
      unifiedConfigService.setCalculationDefaults(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.calculations });
      toast.success('Calculation defaults updated successfully');
    },
    onError: (error) => {
      console.error('Error updating calculation defaults:', error);
      toast.error('Failed to update calculation defaults');
    },
  });

  const updateSystemConfigMutation = useMutation({
    mutationFn: (config: Partial<SystemConfig>) =>
      unifiedConfigService.setSystemConfig(config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.system });
      queryClient.invalidateQueries({ queryKey: ['config', 'feature'] });
      queryClient.invalidateQueries({ queryKey: ['config', 'maintenance'] });
      toast.success('System configuration updated successfully');
    },
    onError: (error) => {
      console.error('Error updating system config:', error);
      toast.error('Failed to update system configuration');
    },
  });

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const refreshConfigurations = async () => {
    await unifiedConfigService.refreshConfigurations();
    queryClient.invalidateQueries({ queryKey: ['config'] });
    toast.success('Configuration cache refreshed');
  };

  const getMinimumPaymentAmount = async (currency: string) => {
    return unifiedConfigService.getMinimumPaymentAmount(currency);
  };

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    // Country Configurations
    useCountryConfig,
    useAllCountries,
    useSupportedCountries,
    useSupportedCurrencies,
    
    // Calculation Configurations
    useCalculationDefaults,
    
    // System Configurations
    useSystemConfig,
    useFeatureFlag,
    useMaintenanceMode,
    
    // Template Configurations
    useTemplates,
    useTemplate,
    
    // Gateway Configurations
    usePaymentGateways,
    useGatewayConfig,
    
    // Mutations
    updateCountryConfig: updateCountryConfigMutation.mutateAsync,
    updateCalculationDefaults: updateCalculationDefaultsMutation.mutateAsync,
    updateSystemConfig: updateSystemConfigMutation.mutateAsync,
    
    // Loading states
    isUpdatingCountryConfig: updateCountryConfigMutation.isPending,
    isUpdatingCalculationDefaults: updateCalculationDefaultsMutation.isPending,
    isUpdatingSystemConfig: updateSystemConfigMutation.isPending,
    
    // Utility functions
    refreshConfigurations,
    getMinimumPaymentAmount,
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for country-specific configurations
 */
export function useCountryConfiguration(countryCode: string) {
  const config = useUnifiedConfig();
  
  const countryQuery = config.useCountryConfig(countryCode);
  const gatewaysQuery = config.usePaymentGateways(countryCode);
  
  return {
    country: countryQuery.data,
    gateways: gatewaysQuery.data || [],
    isLoading: countryQuery.isLoading || gatewaysQuery.isLoading,
    isError: countryQuery.isError || gatewaysQuery.isError,
    error: countryQuery.error || gatewaysQuery.error,
  };
}

/**
 * Hook for admin configuration management
 */
export function useAdminConfiguration() {
  const config = useUnifiedConfig();
  
  const countriesQuery = config.useAllCountries();
  const systemQuery = config.useSystemConfig();
  const calculationQuery = config.useCalculationDefaults();
  const templatesQuery = config.useTemplates();
  
  return {
    countries: countriesQuery.data || {},
    system: systemQuery.data,
    calculations: calculationQuery.data,
    templates: templatesQuery.data || [],
    
    isLoading: countriesQuery.isLoading || systemQuery.isLoading || 
               calculationQuery.isLoading || templatesQuery.isLoading,
    
    updateCountryConfig: config.updateCountryConfig,
    updateSystemConfig: config.updateSystemConfig,
    updateCalculationDefaults: config.updateCalculationDefaults,
    
    isUpdating: config.isUpdatingCountryConfig || config.isUpdatingSystemConfig || 
                config.isUpdatingCalculationDefaults,
    
    refresh: config.refreshConfigurations,
  };
}

/**
 * Hook for payment gateway selection
 */
export function usePaymentConfiguration(countryCode?: string, currency?: string) {
  const config = useUnifiedConfig();
  
  const gatewaysQuery = config.usePaymentGateways(countryCode);
  
  const availableGateways = gatewaysQuery.data?.filter(gateway => 
    !currency || gateway.supported_currencies.includes(currency)
  ) || [];
  
  return {
    gateways: availableGateways,
    isLoading: gatewaysQuery.isLoading,
    isError: gatewaysQuery.isError,
    
    // Helper functions
    getGatewayForCurrency: (targetCurrency: string) => 
      availableGateways.find(g => g.supported_currencies.includes(targetCurrency)),
    
    isGatewaySupported: (gatewayName: string) => 
      availableGateways.some(g => g.gateway_name === gatewayName),
  };
}

/**
 * Hook for feature flag checking
 */
export function useFeatureFlags() {
  const config = useUnifiedConfig();
  const systemQuery = config.useSystemConfig();
  
  const featureFlags = systemQuery.data?.feature_flags || {};
  
  return {
    flags: featureFlags,
    isEnabled: (feature: string) => featureFlags[feature] || false,
    isLoading: systemQuery.isLoading,
    
    // Common feature checks
    isAdvancedCalculatorEnabled: featureFlags.advanced_calculator || false,
    isMLWeightPredictionEnabled: featureFlags.ml_weight_prediction || false,
    isAutoAssignmentEnabled: featureFlags.auto_assignment || false,
  };
}