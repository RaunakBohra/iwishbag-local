/**
 * RESPONSIVE LAYOUT SYSTEM
 *
 * Professional design system foundation based on best practices from
 * Stripe, Salesforce, HubSpot, and Shopify. Implements consistent
 * spacing, breakpoints, and layout patterns for tax calculation interfaces.
 *
 * Features:
 * - 8px grid system for consistent spacing
 * - Mobile-first responsive breakpoints
 * - Card-based layout components
 * - Typography hierarchy
 * - Consistent spacing utilities
 */

import React from 'react';
import { cn } from '@/lib/utils';

// Design System Constants
export const SPACING = {
  xs: '4px', // 0.5 * 8px
  sm: '8px', // 1 * 8px
  md: '16px', // 2 * 8px
  lg: '24px', // 3 * 8px
  xl: '32px', // 4 * 8px
  '2xl': '48px', // 6 * 8px
  '3xl': '64px', // 8 * 8px
} as const;

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Grid System Classes
const GRID_CLASSES = {
  container: 'w-full mx-auto px-4 sm:px-6 lg:px-8',
  grid: 'grid gap-4 md:gap-6 lg:gap-8',
  cols1: 'grid-cols-1',
  cols2: 'grid-cols-1 md:grid-cols-2',
  cols3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  cols4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  autoFit: 'grid-cols-[repeat(auto-fit,minmax(280px,1fr))]',
} as const;

// Spacing Classes
const SPACING_CLASSES = {
  xs: 'space-y-1',
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-6',
  xl: 'space-y-8',
  '2xl': 'space-y-12',
  '3xl': 'space-y-16',
} as const;

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  children: React.ReactNode;
}

export const Container: React.FC<ContainerProps> = ({
  maxWidth = 'full',
  className,
  children,
  ...props
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  return (
    <div className={cn(GRID_CLASSES.container, maxWidthClasses[maxWidth], className)} {...props}>
      {children}
    </div>
  );
};

interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 'auto-fit';
  gap?: keyof typeof SPACING;
  children: React.ReactNode;
}

export const Grid: React.FC<GridProps> = ({
  cols = 1,
  gap = 'md',
  className,
  children,
  ...props
}) => {
  const colsClasses = {
    1: GRID_CLASSES.cols1,
    2: GRID_CLASSES.cols2,
    3: GRID_CLASSES.cols3,
    4: GRID_CLASSES.cols4,
    'auto-fit': GRID_CLASSES.autoFit,
  };

  const gapClasses = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4 md:gap-6',
    lg: 'gap-6 md:gap-8',
    xl: 'gap-8 md:gap-10',
    '2xl': 'gap-12 md:gap-16',
    '3xl': 'gap-16 md:gap-20',
  };

  return (
    <div className={cn('grid', colsClasses[cols], gapClasses[gap], className)} {...props}>
      {children}
    </div>
  );
};

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: keyof typeof SPACING;
  align?: 'start' | 'center' | 'end' | 'stretch';
  children: React.ReactNode;
}

export const Stack: React.FC<StackProps> = ({
  spacing = 'md',
  align = 'stretch',
  className,
  children,
  ...props
}) => {
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  return (
    <div
      className={cn('flex flex-col', SPACING_CLASSES[spacing], alignClasses[align], className)}
      {...props}
    >
      {children}
    </div>
  );
};

interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  gap?: keyof typeof SPACING;
  children: React.ReactNode;
}

export const Flex: React.FC<FlexProps> = ({
  direction = 'row',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  gap = 'md',
  className,
  children,
  ...props
}) => {
  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'col-reverse': 'flex-col-reverse',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };

  const gapClasses = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
    '2xl': 'gap-12',
    '3xl': 'gap-16',
  };

  return (
    <div
      className={cn(
        'flex',
        directionClasses[direction],
        alignClasses[align],
        justifyClasses[justify],
        wrap && 'flex-wrap',
        gapClasses[gap],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost';
  padding?: keyof typeof SPACING;
  children: React.ReactNode;
}

export const LayoutCard: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'lg',
  className,
  children,
  ...props
}) => {
  const variantClasses = {
    default: 'bg-white border border-gray-200 rounded-lg',
    elevated: 'bg-white shadow-lg border border-gray-100 rounded-lg',
    outlined: 'bg-transparent border-2 border-gray-300 rounded-lg',
    ghost: 'bg-gray-50 border-0 rounded-lg',
  };

  const paddingClasses = {
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
    '2xl': 'p-12',
    '3xl': 'p-16',
  };

  return (
    <div
      className={cn(
        variantClasses[variant],
        paddingClasses[padding],
        'transition-all duration-200',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: keyof typeof SPACING;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({
  spacing = 'xl',
  className,
  children,
  ...props
}) => {
  const spacingClasses = {
    xs: 'py-1',
    sm: 'py-2',
    md: 'py-4',
    lg: 'py-6',
    xl: 'py-8',
    '2xl': 'py-12',
    '3xl': 'py-16',
  };

  return (
    <section className={cn(spacingClasses[spacing], className)} {...props}>
      {children}
    </section>
  );
};

// Typography Components
interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'muted' | 'accent';
  children: React.ReactNode;
}

export const Heading: React.FC<HeadingProps> = ({
  level,
  size,
  weight = 'semibold',
  color = 'primary',
  className,
  children,
  ...props
}) => {
  const Component = `h${level}` as keyof JSX.IntrinsicElements;

  // Auto-size based on heading level if not specified
  const autoSize = {
    1: '3xl',
    2: '2xl',
    3: 'xl',
    4: 'lg',
    5: 'base',
    6: 'sm',
  }[level] as const;

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const colorClasses = {
    primary: 'text-gray-900',
    secondary: 'text-gray-700',
    muted: 'text-gray-500',
    accent: 'text-blue-600',
  };

  return (
    <Component
      className={cn(
        sizeClasses[size || autoSize],
        weightClasses[weight],
        colorClasses[color],
        'leading-tight',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: 'xs' | 'sm' | 'base' | 'lg';
  weight?: 'normal' | 'medium' | 'semibold';
  color?: 'primary' | 'secondary' | 'muted' | 'accent';
  children: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  size = 'base',
  weight = 'normal',
  color = 'secondary',
  className,
  children,
  ...props
}) => {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
  };

  const weightClasses = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
  };

  const colorClasses = {
    primary: 'text-gray-900',
    secondary: 'text-gray-700',
    muted: 'text-gray-500',
    accent: 'text-blue-600',
  };

  return (
    <p
      className={cn(
        sizeClasses[size],
        weightClasses[weight],
        colorClasses[color],
        'leading-relaxed',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
};

// Responsive utilities
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = React.useState<keyof typeof BREAKPOINTS | 'xs'>('xs');

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width >= 1536) setBreakpoint('2xl');
      else if (width >= 1280) setBreakpoint('xl');
      else if (width >= 1024) setBreakpoint('lg');
      else if (width >= 768) setBreakpoint('md');
      else if (width >= 640) setBreakpoint('sm');
      else setBreakpoint('xs');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
};

// Export all utilities
export const LayoutUtils = {
  SPACING,
  BREAKPOINTS,
  GRID_CLASSES,
  SPACING_CLASSES,
};
