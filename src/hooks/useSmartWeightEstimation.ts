// ============================================================================
// USE SMART WEIGHT ESTIMATION - Hook for ML-powered weight suggestions
// Features: Debounced estimation, caching, confidence tracking
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { smartWeightEstimator } from '@/services/SmartWeightEstimator';

interface EstimationResult {
  estimated_weight: number;
  confidence: number;
  reasoning: string[];
  suggestions: string[];
}

interface UseSmartWeightEstimationProps {
  productName?: string;
  productUrl?: string;
  debounceMs?: number;
  autoEstimate?: boolean;
}

export const useSmartWeightEstimation = ({
  productName,
  productUrl,
  debounceMs = 800,
  autoEstimate = true,
}: UseSmartWeightEstimationProps) => {
  const [estimation, setEstimation] = useState<EstimationResult | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEstimated, setLastEstimated] = useState<string>('');

  // Manual estimation function
  const estimateWeight = useCallback(
    async (name?: string, url?: string): Promise<EstimationResult | null> => {
      const targetName = name || productName || '';
      const targetUrl = url || productUrl || '';

      if (!targetName.trim() && !targetUrl.trim()) {
        setEstimation(null);
        setError(null);
        return null;
      }

      const cacheKey = `${targetName}|${targetUrl}`;
      if (cacheKey === lastEstimated && estimation) {
        return estimation; // Return cached result
      }

      setIsEstimating(true);
      setError(null);

      try {
        const result = await smartWeightEstimator.estimateWeight(
          targetName,
          targetUrl || undefined
        );
        
        setEstimation(result);
        setLastEstimated(cacheKey);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Estimation failed';
        setError(errorMessage);
        setEstimation(null);
        return null;
      } finally {
        setIsEstimating(false);
      }
    },
    [productName, productUrl, lastEstimated, estimation]
  );

  // Auto-estimation with debouncing
  useEffect(() => {
    if (!autoEstimate) return;

    const timeoutId = setTimeout(() => {
      estimateWeight();
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [productName, productUrl, debounceMs, autoEstimate, estimateWeight]);

  // Learn from user correction
  const learnFromCorrection = useCallback(
    async (actualWeight: number, context?: {
      userConfirmed?: boolean;
      brand?: string;
      size?: string;
    }): Promise<void> => {
      if (!estimation || !productName) {
        throw new Error('Cannot learn without estimation and product name');
      }

      try {
        await smartWeightEstimator.learnFromActualWeight(
          productName,
          actualWeight,
          productUrl || undefined,
          {
            originalEstimate: estimation.estimated_weight,
            userConfirmed: true,
            ...context,
          }
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Learning failed';
        throw new Error(errorMessage);
      }
    },
    [estimation, productName, productUrl]
  );

  // Get confidence level description
  const getConfidenceLevel = useCallback((confidence: number): string => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  }, []);

  // Check if estimate is reasonable
  const isEstimateReasonable = useCallback((userWeight: number): boolean => {
    if (!estimation) return true;
    
    const difference = Math.abs(userWeight - estimation.estimated_weight);
    const relativeDifference = difference / estimation.estimated_weight;
    
    // Flag as unreasonable if difference is more than 200%
    return relativeDifference <= 2.0;
  }, [estimation]);

  return {
    estimation,
    isEstimating,
    error,
    estimateWeight,
    learnFromCorrection,
    getConfidenceLevel,
    isEstimateReasonable,
    hasEstimation: !!estimation,
    confidence: estimation?.confidence || 0,
    reasoning: estimation?.reasoning || [],
    suggestions: estimation?.suggestions || [],
  };
};