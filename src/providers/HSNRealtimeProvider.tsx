/**
 * HSN Real-time Provider
 * Provides real-time HSN calculation updates across the application
 * Integrates with React Query for intelligent caching and background updates
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  hsnQuoteIntegrationService,
  HSNRealTimeOptions,
} from '@/services/HSNQuoteIntegrationService';
import { governmentAPIOrchestrator } from '@/services/api/GovernmentAPIOrchestrator';

interface HSNRealTimeContext {
  isEnabled: boolean;
  systemStatus: 'healthy' | 'degraded' | 'down';
  globalOptions: HSNRealTimeOptions;
  performanceStats: any;

  // Actions
  enableRealTime: () => void;
  disableRealTime: () => void;
  updateGlobalOptions: (options: Partial<HSNRealTimeOptions>) => void;
  forceRefresh: () => void;
  clearAllCaches: () => void;
}

const HSNRealTimeContext = createContext<HSNRealTimeContext | undefined>(undefined);

interface HSNRealTimeProviderProps {
  children: React.ReactNode;
  defaultEnabled?: boolean;
  autoUpdateInterval?: number;
}

export const HSNRealTimeProvider: React.FC<HSNRealTimeProviderProps> = ({
  children,
  defaultEnabled = true,
  autoUpdateInterval = 30000, // 30 seconds
}) => {
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(defaultEnabled);
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');
  const [globalOptions, setGlobalOptions] = useState<HSNRealTimeOptions>({
    enableGovernmentAPIs: defaultEnabled,
    enableAutoClassification: true,
    enableWeightDetection: true,
    enableMinimumValuation: true,
    updateFrequency: 'immediate',
    cacheDuration: 15 * 60 * 1000,
  });
  const [performanceStats, setPerformanceStats] = useState(null);

  // Monitor system health
  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const status = await governmentAPIOrchestrator.getSystemStatus();
        setSystemStatus(status.overall_status);

        // Auto-disable real-time if system is down
        if (status.overall_status === 'down' && isEnabled) {
          console.warn('🚨 [HSN-REALTIME] System down, disabling real-time features');
          setIsEnabled(false);
          setGlobalOptions((prev) => ({ ...prev, enableGovernmentAPIs: false }));
        }
      } catch (error) {
        console.error('Failed to check system health:', error);
        setSystemStatus('down');
      }
    };

    // Initial check
    checkSystemHealth();

    // Periodic health checks
    const healthInterval = setInterval(checkSystemHealth, autoUpdateInterval);
    return () => clearInterval(healthInterval);
  }, [isEnabled, autoUpdateInterval]);

  // Monitor performance stats
  useEffect(() => {
    const updatePerformanceStats = () => {
      const stats = hsnQuoteIntegrationService.getPerformanceStats();
      setPerformanceStats(stats);
    };

    // Initial stats
    updatePerformanceStats();

    // Periodic updates
    const statsInterval = setInterval(updatePerformanceStats, 10000); // 10 seconds
    return () => clearInterval(statsInterval);
  }, []);

  // Background cache warming for frequently used HSN codes
  useEffect(() => {
    if (!isEnabled) return;

    const warmCache = async () => {
      try {
        console.log('🔥 [HSN-REALTIME] Warming cache with common HSN codes');

        // Warm cache with most common HSN codes
        const commonHSNCodes = ['8517', '8471', '6109', '6204', '4901']; // Electronics, clothing, books

        for (const hsnCode of commonHSNCodes) {
          try {
            await governmentAPIOrchestrator.getTaxRate({
              destinationCountry: 'IN',
              hsnCode,
              amount: 100,
              checkMinimumValuation: true,
            });
          } catch (error) {
            // Ignore individual failures during cache warming
            console.warn(`Failed to warm cache for HSN ${hsnCode}:`, error);
          }
        }

        console.log('✅ [HSN-REALTIME] Cache warming completed');
      } catch (error) {
        console.error('Cache warming failed:', error);
      }
    };

    // Warm cache on startup and periodically
    warmCache();
    const warmingInterval = setInterval(warmCache, 60 * 60 * 1000); // 1 hour
    return () => clearInterval(warmingInterval);
  }, [isEnabled]);

  // Invalidate related queries when real-time is toggled
  useEffect(() => {
    if (isEnabled) {
      // Refresh all HSN-related queries when real-time is enabled
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'hsn-quote-calculation' ||
          query.queryKey[0] === 'hsn-system-status' ||
          query.queryKey[0] === 'hsn-performance-stats',
      });
    }
  }, [isEnabled, queryClient]);

  // Actions
  const enableRealTime = () => {
    console.log('🔄 [HSN-REALTIME] Enabling real-time features');
    setIsEnabled(true);
    setGlobalOptions((prev) => ({ ...prev, enableGovernmentAPIs: true }));
  };

  const disableRealTime = () => {
    console.log('⏸️ [HSN-REALTIME] Disabling real-time features');
    setIsEnabled(false);
    setGlobalOptions((prev) => ({ ...prev, enableGovernmentAPIs: false }));
  };

  const updateGlobalOptions = (options: Partial<HSNRealTimeOptions>) => {
    console.log('⚙️ [HSN-REALTIME] Updating global options:', options);
    setGlobalOptions((prev) => ({ ...prev, ...options }));

    // Invalidate queries that depend on these options
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'hsn-quote-calculation',
    });
  };

  const forceRefresh = () => {
    console.log('🔄 [HSN-REALTIME] Force refreshing all HSN data');

    // Clear service caches
    hsnQuoteIntegrationService.clearCaches();

    // Invalidate all HSN queries
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0]?.toString().includes('hsn') ||
        query.queryKey[0] === 'hsn-quote-calculation' ||
        query.queryKey[0] === 'hsn-system-status' ||
        query.queryKey[0] === 'hsn-performance-stats',
    });
  };

  const clearAllCaches = () => {
    console.log('🧹 [HSN-REALTIME] Clearing all caches');
    hsnQuoteIntegrationService.clearCaches();

    // Also remove React Query cache for HSN-related queries
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0]?.toString().includes('hsn'),
    });
  };

  const contextValue: HSNRealTimeContext = {
    isEnabled,
    systemStatus,
    globalOptions,
    performanceStats,
    enableRealTime,
    disableRealTime,
    updateGlobalOptions,
    forceRefresh,
    clearAllCaches,
  };

  return <HSNRealTimeContext.Provider value={contextValue}>{children}</HSNRealTimeContext.Provider>;
};

// Hook to use HSN real-time context
export const useHSNRealTime = (): HSNRealTimeContext => {
  const context = useContext(HSNRealTimeContext);
  if (context === undefined) {
    throw new Error('useHSNRealTime must be used within an HSNRealTimeProvider');
  }
  return context;
};

// HOC for components that need HSN real-time features
export const withHSNRealTime = <P extends object>(
  Component: React.ComponentType<P>,
): React.FC<P> => {
  return (props: P) => {
    const hsnRealTime = useHSNRealTime();
    return <Component {...props} hsnRealTime={hsnRealTime} />;
  };
};

// Hook for automatic real-time updates on quote changes
export const useHSNAutoUpdate = (quoteId: string | undefined) => {
  const { isEnabled, globalOptions } = useHSNRealTime();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isEnabled || !quoteId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh HSN data when user returns to tab
        queryClient.invalidateQueries({
          queryKey: ['hsn-quote-calculation', quoteId],
        });
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up periodic background updates
    let updateInterval: NodeJS.Timeout | null = null;

    if (globalOptions.updateFrequency === 'batch') {
      updateInterval = setInterval(() => {
        queryClient.invalidateQueries({
          queryKey: ['hsn-quote-calculation', quoteId],
        });
      }, 30000); // 30 seconds for batch mode
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, [isEnabled, quoteId, globalOptions.updateFrequency, queryClient]);
};

// Performance monitoring hook
export const useHSNPerformanceMonitor = () => {
  const { performanceStats } = useHSNRealTime();
  const [performanceAlert, setPerformanceAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!performanceStats) return;

    // Check for performance issues
    if (performanceStats.averageProcessingTime > 5000) {
      setPerformanceAlert('High processing time detected. Consider reducing real-time features.');
    } else if (performanceStats.errorsHandled > performanceStats.totalCalculations * 0.1) {
      setPerformanceAlert('High error rate detected. Check system status.');
    } else if (performanceStats.cacheHitRate < 0.3) {
      setPerformanceAlert('Low cache hit rate. Consider increasing cache duration.');
    } else {
      setPerformanceAlert(null);
    }
  }, [performanceStats]);

  return {
    performanceStats,
    performanceAlert,
    isPerformanceGood: !performanceAlert && performanceStats?.averageProcessingTime < 2000,
  };
};
