// =========================
// STRIPE-INSPIRED DESIGN SYSTEM
// =========================
//
// This file contains all design system constants and utilities
// to ensure consistent styling across the entire application.
//
// Based on Stripe's minimal design principles:
// - Clean whites and subtle grays
// - Blue accents for primary actions
// - Consistent spacing and typography
// - Minimal visual noise
// =========================

export const designSystem = {
  // Color Palette
  colors: {
    primary: {
      50: '#eff6ff',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    semantic: {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
    },
  },

  // Typography Scale - Mobile-First Responsive
  typography: {
    // Hero/Display text - progressive scaling
    display: 'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold leading-tight',

    // Headings - responsive scaling
    h1: 'text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight',
    h2: 'text-xl sm:text-2xl lg:text-3xl font-semibold leading-tight',
    h3: 'text-lg sm:text-xl lg:text-2xl font-semibold leading-tight',
    h4: 'text-base sm:text-lg lg:text-xl font-semibold leading-tight',

    // Body text - readable on all devices
    bodyLarge: 'text-base sm:text-lg lg:text-xl font-normal leading-relaxed',
    body: 'text-sm sm:text-base lg:text-lg font-normal leading-normal',
    bodySmall: 'text-xs sm:text-sm lg:text-base font-normal leading-normal',

    // UI text - interface elements
    caption: 'text-xs sm:text-sm font-medium leading-tight',
    label: 'text-xs sm:text-sm lg:text-base font-medium leading-normal',

    // Form elements - touch-friendly
    input: 'text-sm sm:text-base font-normal',
    button: 'text-sm sm:text-base font-medium',
    link: 'text-xs sm:text-sm lg:text-base font-medium',

    // Navigation specific
    navLink: 'text-sm sm:text-base font-medium',
    navTitle: 'text-lg sm:text-xl lg:text-2xl font-semibold',

    // Page structure
    pageTitle: 'text-xl sm:text-2xl lg:text-3xl font-bold leading-tight',
    sectionTitle: 'text-lg sm:text-xl lg:text-2xl font-semibold leading-tight',
    cardTitle: 'text-base sm:text-lg font-semibold leading-tight',
  },

  // Spacing System (based on 4px grid)
  spacing: {
    xs: 'space-y-1', // 4px
    sm: 'space-y-2', // 8px
    md: 'space-y-4', // 16px
    lg: 'space-y-6', // 24px
    xl: 'space-y-8', // 32px
    '2xl': 'space-y-12', // 48px
    '3xl': 'space-y-16', // 64px
    '4xl': 'space-y-20', // 80px
    '5xl': 'space-y-24', // 96px
  },

  // Component Patterns
  components: {
    // Card patterns
    card: {
      base: 'bg-white border border-gray-200 rounded-lg shadow-sm',
      interactive:
        'bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow',
      elevated: 'bg-white border border-gray-200 rounded-lg shadow-md',
    },

    // Button patterns - responsive sizing
    button: {
      primary:
        'bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg px-4 sm:px-6 py-2 sm:py-2.5 h-10 sm:h-11 lg:h-12 transition-colors',
      secondary:
        'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-medium rounded-lg px-4 sm:px-6 py-2 sm:py-2.5 h-10 sm:h-11 lg:h-12 transition-colors',
      ghost:
        'text-gray-700 hover:bg-gray-50 font-medium rounded-lg px-4 sm:px-6 py-2 sm:py-2.5 h-10 sm:h-11 lg:h-12 transition-colors',
      danger:
        'bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg px-4 sm:px-6 py-2 sm:py-2.5 h-10 sm:h-11 lg:h-12 transition-colors',
    },

    // Input patterns - responsive sizing
    input: {
      base: 'border border-gray-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 h-10 sm:h-11 lg:h-12 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors',
      error:
        'border border-red-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 h-10 sm:h-11 lg:h-12 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors',
      disabled:
        'border border-gray-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 h-10 sm:h-11 lg:h-12 bg-gray-50 text-gray-500 cursor-not-allowed',
    },

    // Badge patterns
    badge: {
      primary:
        'bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded-lg text-xs font-medium',
      secondary:
        'bg-gray-50 text-gray-700 border border-gray-200 px-2 py-1 rounded-lg text-xs font-medium',
      success:
        'bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-lg text-xs font-medium',
      error:
        'bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-lg text-xs font-medium',
      warning:
        'bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-1 rounded-lg text-xs font-medium',
    },

    // Alert patterns
    alert: {
      info: 'bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-lg',
      success: 'bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg',
      warning: 'bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-lg',
      error: 'bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg',
    },

    // Layout patterns
    layout: {
      container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
      section: 'py-12 sm:py-16 lg:py-20',
      grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    },
  },

  // Animation patterns
  animation: {
    transition: 'transition-all duration-200 ease-in-out',
    hover: 'hover:scale-105 transition-transform duration-200',
    fadeIn: 'animate-fade-in',
  },

  // Responsive breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

// Utility functions for consistent styling
export const cn = (...classes: (string | undefined | null | boolean)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Helper functions for common patterns
export const getCardClasses = (variant: keyof typeof designSystem.components.card = 'base') => {
  return designSystem.components.card[variant];
};

export const getButtonClasses = (
  variant: keyof typeof designSystem.components.button = 'primary',
) => {
  return designSystem.components.button[variant];
};

export const getInputClasses = (variant: keyof typeof designSystem.components.input = 'base') => {
  return designSystem.components.input[variant];
};

export const getBadgeClasses = (
  variant: keyof typeof designSystem.components.badge = 'primary',
) => {
  return designSystem.components.badge[variant];
};

export const getAlertClasses = (variant: keyof typeof designSystem.components.alert = 'info') => {
  return designSystem.components.alert[variant];
};

// Status color mapping for consistent status displays
export const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    // Quote statuses
    pending: 'bg-gray-50 text-gray-700 border-gray-200',
    sent: 'bg-teal-50 text-teal-700 border-teal-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',

    // Order statuses
    paid: 'bg-green-50 text-green-700 border-green-200',
    ordered: 'bg-teal-50 text-teal-700 border-teal-200',
    shipped: 'bg-orange-50 text-orange-700 border-orange-200',
    delivered: 'bg-green-50 text-green-700 border-green-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',

    // Payment statuses
    success: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    processing: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };

  return statusColors[status.toLowerCase()] || statusColors.pending;
};

// Priority color mapping
export const getPriorityColor = (priority: string) => {
  const priorityColors: Record<string, string> = {
    high: 'bg-red-50 text-red-700 border-red-200',
    medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    low: 'bg-green-50 text-green-700 border-green-200',
  };

  return priorityColors[priority.toLowerCase()] || priorityColors.medium;
};

export default designSystem;
