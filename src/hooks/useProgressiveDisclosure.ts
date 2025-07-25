import { useState, useCallback, useEffect } from 'react';
import { DisclosureLevel } from '@/components/ui/progressive-disclosure';

interface ProgressiveDisclosureConfig {
  defaultLevel?: DisclosureLevel;
  persistKey?: string;
  autoProgressThreshold?: number; // Auto-advance to next level after N interactions
  analyticsEnabled?: boolean;
}

interface DisclosureMetrics {
  interactions: number;
  timeSpent: number;
  levelChanges: number;
  sectionsExpanded: number;
}

export function useProgressiveDisclosure(config: ProgressiveDisclosureConfig = {}) {
  const {
    defaultLevel = DisclosureLevel.ESSENTIAL,
    persistKey,
    autoProgressThreshold,
    analyticsEnabled = false,
  } = config;

  // Load saved level from localStorage
  const getSavedLevel = (): DisclosureLevel => {
    if (!persistKey || typeof window === 'undefined') return defaultLevel;
    
    const saved = localStorage.getItem(`pd-level-${persistKey}`);
    return saved ? (parseInt(saved) as DisclosureLevel) : defaultLevel;
  };

  const [currentLevel, setCurrentLevel] = useState<DisclosureLevel>(getSavedLevel);
  const [metrics, setMetrics] = useState<DisclosureMetrics>({
    interactions: 0,
    timeSpent: 0,
    levelChanges: 0,
    sectionsExpanded: 0,
  });
  const [sessionStart] = useState(Date.now());

  // Save level to localStorage
  const saveLevel = useCallback((level: DisclosureLevel) => {
    if (persistKey && typeof window !== 'undefined') {
      localStorage.setItem(`pd-level-${persistKey}`, level.toString());
    }
  }, [persistKey]);

  // Track metrics
  const trackInteraction = useCallback(() => {
    if (!analyticsEnabled) return;

    setMetrics(prev => ({
      ...prev,
      interactions: prev.interactions + 1,
    }));

    // Auto-progress logic
    if (autoProgressThreshold && metrics.interactions >= autoProgressThreshold) {
      if (currentLevel < DisclosureLevel.EXPERT) {
        setCurrentLevel(currentLevel + 1);
        setMetrics(prev => ({
          ...prev,
          levelChanges: prev.levelChanges + 1,
          interactions: 0, // Reset counter
        }));
      }
    }
  }, [analyticsEnabled, autoProgressThreshold, metrics.interactions, currentLevel]);

  // Update time spent metric
  useEffect(() => {
    if (!analyticsEnabled) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        timeSpent: Math.floor((Date.now() - sessionStart) / 1000),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [analyticsEnabled, sessionStart]);

  // Level management functions
  const setLevel = useCallback((level: DisclosureLevel) => {
    setCurrentLevel(level);
    saveLevel(level);
    
    if (analyticsEnabled) {
      setMetrics(prev => ({
        ...prev,
        levelChanges: prev.levelChanges + 1,
      }));
    }
  }, [saveLevel, analyticsEnabled]);

  const incrementLevel = useCallback(() => {
    if (currentLevel < DisclosureLevel.EXPERT) {
      setLevel(currentLevel + 1);
    }
  }, [currentLevel, setLevel]);

  const decrementLevel = useCallback(() => {
    if (currentLevel > DisclosureLevel.SUMMARY) {
      setLevel(currentLevel - 1);
    }
  }, [currentLevel, setLevel]);

  // Helper functions
  const isVisible = useCallback((minLevel: DisclosureLevel): boolean => {
    return currentLevel >= minLevel;
  }, [currentLevel]);

  const getLevelName = useCallback((): string => {
    const names = {
      [DisclosureLevel.SUMMARY]: 'Summary',
      [DisclosureLevel.ESSENTIAL]: 'Essential',
      [DisclosureLevel.ADVANCED]: 'Advanced',
      [DisclosureLevel.EXPERT]: 'Expert',
    };
    return names[currentLevel];
  }, [currentLevel]);

  const getLevelProgress = useCallback((): number => {
    return ((currentLevel - 1) / (DisclosureLevel.EXPERT - 1)) * 100;
  }, [currentLevel]);

  // Get recommendations based on user behavior
  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];

    if (metrics.interactions > 20 && currentLevel === DisclosureLevel.SUMMARY) {
      recommendations.push('You seem engaged! Try Essential view for more details.');
    }

    if (metrics.timeSpent > 300 && currentLevel < DisclosureLevel.ADVANCED) {
      recommendations.push('You\'ve spent some time here. Advanced view might help you work faster.');
    }

    if (metrics.sectionsExpanded > 5 && currentLevel < DisclosureLevel.EXPERT) {
      recommendations.push('You\'re exploring many sections. Expert view shows everything at once.');
    }

    return recommendations;
  }, [metrics, currentLevel]);

  return {
    // State
    currentLevel,
    metrics,
    
    // Actions
    setLevel,
    incrementLevel,
    decrementLevel,
    trackInteraction,
    
    // Helpers
    isVisible,
    getLevelName,
    getLevelProgress,
    getRecommendations,
    
    // Constants
    levels: {
      SUMMARY: DisclosureLevel.SUMMARY,
      ESSENTIAL: DisclosureLevel.ESSENTIAL,
      ADVANCED: DisclosureLevel.ADVANCED,
      EXPERT: DisclosureLevel.EXPERT,
    },
  };
}