import * as React from 'react';
import { cn } from '@/lib/utils';
import { designSystem } from '@/lib/design-system';

// Spacing utility components that enforce the design system

interface SpacingProps {
  children: React.ReactNode;
  className?: string;
}

// Section wrapper with consistent padding
export const Section = React.forwardRef<HTMLElement, SpacingProps>(
  ({ children, className, ...props }, ref) => (
    <section ref={ref} className={cn(designSystem.components.layout.section, className)} {...props}>
      {children}
    </section>
  )
);
Section.displayName = 'Section';

// Container with consistent max-width and padding
export const Container = React.forwardRef<HTMLDivElement, SpacingProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn(designSystem.components.layout.container, className)} {...props}>
      {children}
    </div>
  )
);
Container.displayName = 'Container';

// Grid with consistent spacing
export const Grid = React.forwardRef<HTMLDivElement, SpacingProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn(designSystem.components.layout.grid, className)} {...props}>
      {children}
    </div>
  )
);
Grid.displayName = 'Grid';

// Vertical spacing components
export const StackXs = React.forwardRef<HTMLDivElement, SpacingProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn(designSystem.spacing.xs, className)} {...props}>
      {children}
    </div>
  )
);
StackXs.displayName = 'StackXs';

export const StackSm = React.forwardRef<HTMLDivElement, SpacingProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn(designSystem.spacing.sm, className)} {...props}>
      {children}
    </div>
  )
);
StackSm.displayName = 'StackSm';

export const StackMd = React.forwardRef<HTMLDivElement, SpacingProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn(designSystem.spacing.md, className)} {...props}>
      {children}
    </div>
  )
);
StackMd.displayName = 'StackMd';

export const StackLg = React.forwardRef<HTMLDivElement, SpacingProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn(designSystem.spacing.lg, className)} {...props}>
      {children}
    </div>
  )
);
StackLg.displayName = 'StackLg';

export const StackXl = React.forwardRef<HTMLDivElement, SpacingProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn(designSystem.spacing.xl, className)} {...props}>
      {children}
    </div>
  )
);
StackXl.displayName = 'StackXl';

export const Stack2xl = React.forwardRef<HTMLDivElement, SpacingProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn(designSystem.spacing['2xl'], className)} {...props}>
      {children}
    </div>
  )
);
Stack2xl.displayName = 'Stack2xl';

export const Stack3xl = React.forwardRef<HTMLDivElement, SpacingProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn(designSystem.spacing['3xl'], className)} {...props}>
      {children}
    </div>
  )
);
Stack3xl.displayName = 'Stack3xl';

export const Stack4xl = React.forwardRef<HTMLDivElement, SpacingProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn(designSystem.spacing['4xl'], className)} {...props}>
      {children}
    </div>
  )
);
Stack4xl.displayName = 'Stack4xl';

export const Stack5xl = React.forwardRef<HTMLDivElement, SpacingProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn(designSystem.spacing['5xl'], className)} {...props}>
      {children}
    </div>
  )
);
Stack5xl.displayName = 'Stack5xl';

// Export all spacing components
export const Spacing = {
  Section,
  Container,
  Grid,
  StackXs,
  StackSm,
  StackMd,
  StackLg,
  StackXl,
  Stack2xl,
  Stack3xl,
  Stack4xl,
  Stack5xl,
};