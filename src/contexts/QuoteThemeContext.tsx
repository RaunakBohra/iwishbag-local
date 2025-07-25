import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import {
  customerTheme,
  adminTheme,
  colorUtils,
  cssVariables,
  type CustomerTheme,
  type AdminTheme,
} from '@/styles/colors/quote-themes';

// Cultural region detection based on user location or preferences
type CulturalRegion = 'india' | 'nepal' | 'international';
type UserType = 'admin' | 'customer' | 'guest';
type AccessibilityLevel = 'aa' | 'aaa';

interface QuoteThemeContextType {
  // Theme Information
  userType: UserType;
  theme: CustomerTheme | AdminTheme;
  colors: CustomerTheme | AdminTheme;

  // Cultural & Accessibility
  culturalRegion: CulturalRegion;
  accessibilityLevel: AccessibilityLevel;

  // Theme Utilities
  getActionColor: (action: 'approve' | 'add-to-cart' | 'checkout' | 'trust' | 'neutral') => string;
  getCulturalColors: () => typeof customerTheme.cultural.international;
  getAccessibleColors: () => typeof customerTheme.accessibility.aa;

  // CSS Variables for styled-components or CSS-in-JS
  cssVars: Record<string, string>;

  // Manual override (for testing/admin previews)
  setThemeOverride: (override: UserType | null) => void;
}

const QuoteThemeContext = createContext<QuoteThemeContextType | undefined>(undefined);

interface QuoteThemeProviderProps {
  children: React.ReactNode;
  culturalRegion?: CulturalRegion;
  accessibilityLevel?: AccessibilityLevel;
  themeOverride?: UserType | null; // For testing or admin previews
}

export const QuoteThemeProvider: React.FC<QuoteThemeProviderProps> = ({
  children,
  culturalRegion = 'international',
  accessibilityLevel = 'aa',
  themeOverride = null,
}) => {
  const { user } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useAdminRole();
  const [manualOverride, setManualOverride] = React.useState<UserType | null>(themeOverride);

  // Determine user type for theming
  const userType: UserType = useMemo(() => {
    // Manual override takes precedence (for testing/admin previews)
    if (manualOverride) return manualOverride;
    if (themeOverride) return themeOverride;

    // Determine based on authentication and role
    if (isAdminLoading) return 'guest'; // Default while loading
    if (isAdmin) return 'admin';
    if (user) return 'customer';
    return 'guest';
  }, [user, isAdmin, isAdminLoading, manualOverride, themeOverride]);

  // Select appropriate theme
  const theme = useMemo(() => {
    return colorUtils.getTheme(userType);
  }, [userType]);

  // Get CSS variables for the current theme
  const cssVars = useMemo(() => {
    return userType === 'admin' ? cssVariables.admin : cssVariables.customer;
  }, [userType]);

  // Theme utility functions
  const getActionColor = useMemo(() => {
    return (action: 'approve' | 'add-to-cart' | 'checkout' | 'trust' | 'neutral') => {
      return colorUtils.getActionColor(action, userType === 'admin' ? 'admin' : 'customer');
    };
  }, [userType]);

  const getCulturalColors = useMemo(() => {
    return () => colorUtils.getCulturalTheme(culturalRegion);
  }, [culturalRegion]);

  const getAccessibleColors = useMemo(() => {
    return () => colorUtils.getAccessibleColors(accessibilityLevel);
  }, [accessibilityLevel]);

  // Apply CSS custom properties to document root
  useEffect(() => {
    const root = document.documentElement;

    // Apply theme-specific CSS variables
    Object.entries(cssVars).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    // Apply cultural variants if customer theme
    if (userType !== 'admin') {
      const culturalColors = getCulturalColors();
      root.style.setProperty('--quote-cultural-primary', culturalColors.primary);
      root.style.setProperty('--quote-cultural-accent', culturalColors.accent);
      root.style.setProperty('--quote-cultural-success', culturalColors.success);
    }

    // Apply accessibility variants
    const accessibleColors = getAccessibleColors();
    root.style.setProperty('--quote-accessible-primary', accessibleColors.primary);
    root.style.setProperty('--quote-accessible-text', accessibleColors.text);

    // Add theme class to body for scoped styling
    document.body.classList.remove('theme-admin', 'theme-customer', 'theme-guest');
    document.body.classList.add(`theme-${userType}`);

    // Cleanup function
    return () => {
      Object.keys(cssVars).forEach((property) => {
        root.style.removeProperty(property);
      });
      root.style.removeProperty('--quote-cultural-primary');
      root.style.removeProperty('--quote-cultural-accent');
      root.style.removeProperty('--quote-cultural-success');
      root.style.removeProperty('--quote-accessible-primary');
      root.style.removeProperty('--quote-accessible-text');
    };
  }, [cssVars, userType, getCulturalColors, getAccessibleColors]);

  const contextValue: QuoteThemeContextType = {
    userType,
    theme,
    colors: theme,
    culturalRegion,
    accessibilityLevel,
    getActionColor,
    getCulturalColors,
    getAccessibleColors,
    cssVars,
    setThemeOverride: setManualOverride,
  };

  return <QuoteThemeContext.Provider value={contextValue}>{children}</QuoteThemeContext.Provider>;
};

/**
 * Hook to access the quote theme context
 * Provides type-safe access to theme colors and utilities
 */
export const useQuoteTheme = (): QuoteThemeContextType => {
  const context = useContext(QuoteThemeContext);

  if (context === undefined) {
    throw new Error('useQuoteTheme must be used within a QuoteThemeProvider');
  }

  return context;
};

/**
 * HOC for components that need theme context
 * Wraps component with QuoteThemeProvider if not already present
 */
export function withQuoteTheme<P extends object>(
  Component: React.ComponentType<P>,
  themeOptions?: {
    culturalRegion?: CulturalRegion;
    accessibilityLevel?: AccessibilityLevel;
    themeOverride?: UserType;
  },
) {
  return React.forwardRef<any, P>((props, ref) => {
    return (
      <QuoteThemeProvider {...themeOptions}>
        <Component {...props} ref={ref} />
      </QuoteThemeProvider>
    );
  });
}

/**
 * Utility hook for getting specific color values
 * Useful for styled-components or inline styles
 */
export const useQuoteColors = () => {
  const { colors, getActionColor, getCulturalColors, getAccessibleColors } = useQuoteTheme();

  return {
    // Direct color access
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    background: colors.background,
    card: colors.card,
    border: colors.border,
    text: colors.text,

    // Utility functions
    getActionColor,
    getCulturalColors,
    getAccessibleColors,

    // Full theme object
    theme: colors,
  };
};

/**
 * Hook for conversion-optimized button colors
 * Specifically designed for psychology-driven CTAs
 */
export const useConversionColors = () => {
  const { userType, getActionColor } = useQuoteTheme();

  return {
    // High-conversion action colors
    approveButton: getActionColor('approve'), // Orange-red for urgency
    addToCartButton: getActionColor('add-to-cart'), // Orange for energy
    checkoutButton: getActionColor('checkout'), // Orange-red for urgency
    trustElement: getActionColor('trust'), // Blue for trust
    neutralAction: getActionColor('neutral'), // Gray for neutral

    // Context information
    isAdmin: userType === 'admin',
    isCustomer: userType === 'customer' || userType === 'guest',
  };
};
