/**
 * Cart Design System - International Standards Compliant
 * 
 * Based on:
 * - Material Design 3 (Google)
 * - Apple Human Interface Guidelines
 * - Shopify Polaris Design System
 * - Nielsen Norman Group UX Research
 */

export const cartDesignTokens = {
  // Typography Scale (Material Design 3)
  typography: {
    // Headings
    title: {
      large: 'text-2xl font-bold text-gray-900 leading-tight', // Page titles
      medium: 'text-xl font-semibold text-gray-900 leading-tight', // Section titles
      small: 'text-lg font-semibold text-gray-900 leading-tight', // Card titles
    },
    
    // Body text
    body: {
      large: 'text-base font-medium text-gray-800 leading-relaxed', // Primary content
      medium: 'text-sm font-medium text-gray-700 leading-relaxed', // Secondary content
      small: 'text-xs font-medium text-gray-600 leading-relaxed', // Tertiary content
    },
    
    // Labels and metadata
    label: {
      large: 'text-sm font-semibold text-gray-900 uppercase tracking-wide', // Section labels
      medium: 'text-xs font-semibold text-gray-700 uppercase tracking-wide', // Field labels
      small: 'text-xs font-medium text-gray-600', // Helper text
    },
    
    // Prices and numbers
    price: {
      primary: 'text-2xl font-bold text-gray-900 tabular-nums', // Main price
      secondary: 'text-lg font-semibold text-gray-800 tabular-nums', // Secondary prices
      small: 'text-base font-medium text-gray-700 tabular-nums', // Small prices
    }
  },

  // Spacing Scale (8pt grid system)
  spacing: {
    // Container padding
    container: {
      mobile: 'px-4 py-4',
      tablet: 'px-6 py-6', 
      desktop: 'px-8 py-8',
    },
    
    // Component padding
    component: {
      tight: 'p-3',
      normal: 'p-4',
      comfortable: 'p-6',
      spacious: 'p-8',
    },
    
    // Element gaps
    gap: {
      tight: 'gap-2',
      normal: 'gap-3',
      comfortable: 'gap-4',
      spacious: 'gap-6',
    },
    
    // Vertical rhythm
    stack: {
      tight: 'space-y-2',
      normal: 'space-y-3',
      comfortable: 'space-y-4',
      spacious: 'space-y-6',
    }
  },

  // Color System (Accessible contrast ratios)
  colors: {
    // Text colors (WCAG AA compliant)
    text: {
      primary: 'text-gray-900', // 16:1 contrast
      secondary: 'text-gray-700', // 8:1 contrast  
      tertiary: 'text-gray-600', // 6:1 contrast
      muted: 'text-gray-500', // 4.5:1 contrast
      disabled: 'text-gray-400', // 3:1 contrast
    },
    
    // Background colors
    background: {
      primary: 'bg-white',
      secondary: 'bg-gray-50',
      tertiary: 'bg-gray-100',
      elevated: 'bg-white shadow-sm border border-gray-200',
    },
    
    // Interactive colors
    interactive: {
      primary: 'text-blue-600 hover:text-blue-700',
      success: 'text-green-600',
      warning: 'text-amber-600',
      error: 'text-red-600',
    }
  },

  // Component variants
  components: {
    card: {
      default: 'bg-white border border-gray-200 rounded-lg shadow-sm',
      elevated: 'bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow',
      interactive: 'bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-gray-300 transition-all cursor-pointer',
    },
    
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium px-4 py-2 rounded-lg transition-colors',
      ghost: 'text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-medium px-3 py-2 rounded-lg transition-colors',
    }
  },

  // Layout patterns
  layout: {
    // Grid systems
    grid: {
      cartMain: 'grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8',
      cartItems: 'lg:col-span-2 space-y-4',
      cartSummary: 'lg:col-span-1',
    },
    
    // Flex patterns  
    flex: {
      itemRow: 'flex items-center gap-4',
      itemColumn: 'flex flex-col gap-2',
      spaceBetween: 'flex items-center justify-between',
      centered: 'flex items-center justify-center',
    }
  }
} as const;

/**
 * Responsive breakpoints following mobile-first approach
 */
export const breakpoints = {
  mobile: '0px',     // 0px and up
  tablet: '640px',   // 640px and up (sm)
  desktop: '1024px', // 1024px and up (lg)
  wide: '1280px',    // 1280px and up (xl)
} as const;

/**
 * Animation tokens for consistent motion design
 */
export const animations = {
  // Duration
  duration: {
    fast: 'duration-150',
    normal: 'duration-200', 
    slow: 'duration-300',
  },
  
  // Easing
  easing: {
    standard: 'ease-out',
    emphasized: 'ease-in-out',
  },
  
  // Common transitions
  transition: {
    all: 'transition-all duration-200 ease-out',
    colors: 'transition-colors duration-200 ease-out',
    shadow: 'transition-shadow duration-200 ease-out',
    transform: 'transition-transform duration-200 ease-out',
  }
} as const;

/**
 * Accessibility tokens
 */
export const a11y = {
  // Focus states
  focus: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  
  // Interactive area minimums (44px touch target)
  touchTarget: 'min-h-[44px] min-w-[44px]',
  
  // Screen reader only
  srOnly: 'sr-only',
} as const;

/**
 * Helper function to build consistent component classes
 */
export const buildComponentClass = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

export default cartDesignTokens;