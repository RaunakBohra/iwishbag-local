import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { customerTheme } from '@/styles/colors/quote-themes';

/**
 * A/B Testing Color Variants for Conversion Optimization
 * Tests different color combinations to maximize quote approvals and purchases
 */

interface ColorVariant {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  description: string;
  targetMetric: string;
}

// Color variants for A/B testing
export const COLOR_VARIANTS: Record<string, ColorVariant> = {
  // Control group - our research-based colors
  control: {
    name: 'Control (Research-Based)',
    primary: '#FF6B35',      // Orange-red for urgency
    secondary: '#FF8500',    // Orange for energy
    accent: '#1565C0',       // Trust blue
    description: 'Research-backed psychology colors',
    targetMetric: 'baseline_conversion'
  },
  
  // High urgency variant
  urgency_boost: {
    name: 'High Urgency',
    primary: '#DC2626',      // Stronger red for more urgency
    secondary: '#EA580C',    // Urgent orange
    accent: '#1565C0',       // Keep trust blue
    description: 'Stronger urgency colors for immediate action',
    targetMetric: 'quick_approval_rate'
  },
  
  // Warmth optimized variant
  warmth_focused: {
    name: 'Warmth Focused',
    primary: '#F59E0B',      // Warm amber
    secondary: '#FB923C',    // Warm orange
    accent: '#0369A1',       // Deeper trust blue
    description: 'Warmer colors for happiness association',
    targetMetric: 'customer_satisfaction'
  },
  
  // Trust maximized variant
  trust_maximized: {
    name: 'Trust Maximized',
    primary: '#059669',      // Trust green (growth, prosperity)
    secondary: '#0891B2',    // Secondary trust cyan
    accent: '#1E40AF',       // Deep trust blue
    description: 'Maximum trust colors for international shopping',
    targetMetric: 'international_conversion'
  },
  
  // Cultural India variant
  india_optimized: {
    name: 'India Optimized',
    primary: '#EA580C',      // Saffron/orange (auspicious)
    secondary: '#DC2626',    // Cultural red
    accent: '#1565C0',       // Universal trust blue
    description: 'Colors optimized for Indian cultural preferences',
    targetMetric: 'india_market_conversion'
  },
  
  // Cultural Nepal variant
  nepal_optimized: {
    name: 'Nepal Optimized',
    primary: '#DC143C',      // Nepal flag red
    secondary: '#F59E0B',    // Warm gold/amber
    accent: '#003893',       // Nepal flag blue
    description: 'Colors matching Nepal cultural preferences',
    targetMetric: 'nepal_market_conversion'
  }
};

interface ABTestConfig {
  testName: string;
  variants: string[];
  trafficSplit: Record<string, number>; // Percentage allocation
  isActive: boolean;
}

// Active A/B tests configuration
const ACTIVE_TESTS: Record<string, ABTestConfig> = {
  quote_approval_colors: {
    testName: 'Quote Approval Color Psychology',
    variants: ['control', 'urgency_boost', 'warmth_focused'],
    trafficSplit: {
      control: 40,        // 40% get research-based colors
      urgency_boost: 30,  // 30% get high urgency colors
      warmth_focused: 30  // 30% get warmth-focused colors
    },
    isActive: true
  },
  
  international_trust: {
    testName: 'International Shopping Trust Colors',
    variants: ['control', 'trust_maximized'],
    trafficSplit: {
      control: 50,
      trust_maximized: 50
    },
    isActive: true
  },
  
  cultural_optimization: {
    testName: 'Cultural Color Preferences',
    variants: ['control', 'india_optimized', 'nepal_optimized'],
    trafficSplit: {
      control: 40,
      india_optimized: 30,
      nepal_optimized: 30
    },
    isActive: false // Activate based on user location
  }
};

/**
 * Simple hash function for consistent user assignment
 */
function hashUserId(userId: string, testName: string): number {
  let hash = 0;
  const input = `${userId}-${testName}`;
  
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash);
}

/**
 * Determine which variant a user should see
 */
function assignVariant(userId: string, testConfig: ABTestConfig): string {
  const hash = hashUserId(userId, testConfig.testName);
  const bucket = hash % 100; // 0-99
  
  let cumulativePercentage = 0;
  for (const [variant, percentage] of Object.entries(testConfig.trafficSplit)) {
    cumulativePercentage += percentage;
    if (bucket < cumulativePercentage) {
      return variant;
    }
  }
  
  // Fallback to control
  return 'control';
}

/**
 * Hook for A/B testing color variants
 */
export const useColorVariantTesting = (testName?: string) => {
  const { user } = useAuth();
  
  // Use user ID or create anonymous identifier
  const userId = useMemo(() => {
    if (user?.id) return user.id;
    
    // Create persistent anonymous ID for consistent variant assignment
    let anonymousId = sessionStorage.getItem('anonymous_ab_id');
    if (!anonymousId) {
      anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('anonymous_ab_id', anonymousId);
    }
    return anonymousId;
  }, [user?.id]);
  
  // Determine which test to use
  const activeTestName = testName || 'quote_approval_colors';
  const testConfig = ACTIVE_TESTS[activeTestName];
  
  // Get assigned variant
  const variant = useMemo(() => {
    if (!testConfig || !testConfig.isActive) {
      return 'control';
    }
    
    return assignVariant(userId, testConfig);
  }, [userId, testConfig]);
  
  // Get color scheme for assigned variant
  const colorScheme = useMemo(() => {
    const variantConfig = COLOR_VARIANTS[variant] || COLOR_VARIANTS.control;
    return {
      primary: variantConfig.primary,
      secondary: variantConfig.secondary,
      accent: variantConfig.accent,
      // Merge with other theme colors
      ...customerTheme,
      // Override with variant colors
      primary: variantConfig.primary,
      secondary: variantConfig.secondary,
      accent: variantConfig.accent,
    };
  }, [variant]);
  
  // Analytics tracking function
  const trackConversion = useMemo(() => {
    return (action: string, value?: number) => {
      // Track conversion event with variant information
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'ab_test_conversion', {
          test_name: activeTestName,
          variant: variant,
          action: action,
          value: value,
          user_id: userId,
        });
      }
      
      // Also track to console for development
      console.log('🧪 A/B Test Conversion:', {
        testName: activeTestName,
        variant,
        action,
        value,
        userId,
        timestamp: new Date().toISOString()
      });
    };
  }, [activeTestName, variant, userId]);
  
  return {
    // Current variant information
    variant,
    variantName: COLOR_VARIANTS[variant]?.name || 'Unknown',
    variantDescription: COLOR_VARIANTS[variant]?.description || '',
    
    // Color scheme
    colors: colorScheme,
    
    // Test information
    testName: activeTestName,
    isActive: testConfig?.isActive || false,
    
    // Analytics
    trackConversion,
    
    // Utilities
    isControl: variant === 'control',
    isTestVariant: variant !== 'control',
  };
};

/**
 * Hook specifically for conversion-critical buttons
 */
export const useConversionButtonColors = () => {
  const { colors, trackConversion, variant } = useColorVariantTesting('quote_approval_colors');
  
  return {
    // Button-specific colors
    approveButton: colors.primary,
    addToCartButton: colors.secondary,
    checkoutButton: colors.primary,
    trustButton: colors.accent,
    
    // Event tracking helpers
    onApproveClick: () => trackConversion('quote_approved'),
    onAddToCartClick: () => trackConversion('added_to_cart'),
    onCheckoutClick: (value?: number) => trackConversion('checkout_started', value),
    
    // Variant info for styling classes
    variantClass: `color-variant-${variant}`,
    variant,
  };
};

/**
 * Utility function to force a specific variant (for testing/admin)
 */
export const setColorVariantOverride = (variant: string | null) => {
  if (variant) {
    sessionStorage.setItem('color_variant_override', variant);
  } else {
    sessionStorage.removeItem('color_variant_override');
  }
  
  // Reload to apply changes
  window.location.reload();
};

/**
 * Get override variant from session storage
 */
export const getColorVariantOverride = (): string | null => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('color_variant_override');
};