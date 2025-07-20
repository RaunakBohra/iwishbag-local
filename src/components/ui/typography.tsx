import * as React from 'react';
import { cn } from '@/lib/utils';
import { designSystem } from '@/lib/design-system';

// Typography components that enforce the design system

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
}

export const Display = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h1 ref={ref} className={cn(designSystem.typography.display, 'text-gray-900', className)} {...props}>
      {children}
    </h1>
  )
);
Display.displayName = 'Display';

export const H1 = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h1 ref={ref} className={cn(designSystem.typography.h1, 'text-gray-900', className)} {...props}>
      {children}
    </h1>
  )
);
H1.displayName = 'H1';

export const H2 = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h2 ref={ref} className={cn(designSystem.typography.h2, 'text-gray-900', className)} {...props}>
      {children}
    </h2>
  )
);
H2.displayName = 'H2';

export const H3 = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h3 ref={ref} className={cn(designSystem.typography.h3, 'text-gray-900', className)} {...props}>
      {children}
    </h3>
  )
);
H3.displayName = 'H3';

export const H4 = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h4 ref={ref} className={cn(designSystem.typography.h4, 'text-gray-900', className)} {...props}>
      {children}
    </h4>
  )
);
H4.displayName = 'H4';

export const BodyLarge = React.forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <p ref={ref} className={cn(designSystem.typography.bodyLarge, 'text-gray-700', className)} {...props}>
      {children}
    </p>
  )
);
BodyLarge.displayName = 'BodyLarge';

export const Body = React.forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <p ref={ref} className={cn(designSystem.typography.body, 'text-gray-700', className)} {...props}>
      {children}
    </p>
  )
);
Body.displayName = 'Body';

export const BodySmall = React.forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <p ref={ref} className={cn(designSystem.typography.bodySmall, 'text-gray-600', className)} {...props}>
      {children}
    </p>
  )
);
BodySmall.displayName = 'BodySmall';

export const Caption = React.forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <p ref={ref} className={cn(designSystem.typography.caption, 'text-gray-500', className)} {...props}>
      {children}
    </p>
  )
);
Caption.displayName = 'Caption';

// Specialized typography components for specific use cases
export const SectionHeading = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h2 ref={ref} className={cn(designSystem.typography.sectionTitle, 'text-gray-900 mb-4', className)} {...props}>
      {children}
    </h2>
  )
);
SectionHeading.displayName = 'SectionHeading';

export const SubHeading = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h3 ref={ref} className={cn(designSystem.typography.h3, 'text-gray-900 mb-3', className)} {...props}>
      {children}
    </h3>
  )
);
SubHeading.displayName = 'SubHeading';

export const SectionDescription = React.forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <p ref={ref} className={cn(designSystem.typography.bodyLarge, 'text-gray-600 max-w-2xl', className)} {...props}>
      {children}
    </p>
  )
);
SectionDescription.displayName = 'SectionDescription';

export const StatNumber = React.forwardRef<HTMLDivElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cn('text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900', className)} {...props}>
      {children}
    </div>
  )
);
StatNumber.displayName = 'StatNumber';

export const StatLabel = React.forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <p ref={ref} className={cn(designSystem.typography.bodySmall, 'text-gray-500', className)} {...props}>
      {children}
    </p>
  )
);
StatLabel.displayName = 'StatLabel';

// New responsive typography components
export const PageTitle = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h1 ref={ref} className={cn(designSystem.typography.pageTitle, 'text-gray-900', className)} {...props}>
      {children}
    </h1>
  )
);
PageTitle.displayName = 'PageTitle';

export const CardTitle = React.forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => (
    <h3 ref={ref} className={cn(designSystem.typography.cardTitle, 'text-gray-900', className)} {...props}>
      {children}
    </h3>
  )
);
CardTitle.displayName = 'CardTitle';

export const NavLink = React.forwardRef<HTMLAnchorElement, TypographyProps & React.AnchorHTMLAttributes<HTMLAnchorElement>>(
  ({ children, className, ...props }, ref) => (
    <a ref={ref} className={cn(designSystem.typography.navLink, 'text-gray-700 hover:text-gray-900', className)} {...props}>
      {children}
    </a>
  )
);
NavLink.displayName = 'NavLink';

export const FormLabel = React.forwardRef<HTMLLabelElement, TypographyProps & React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ children, className, ...props }, ref) => (
    <label ref={ref} className={cn(designSystem.typography.label, 'text-gray-700', className)} {...props}>
      {children}
    </label>
  )
);
FormLabel.displayName = 'FormLabel';

// Export all typography components
export const Typography = {
  Display,
  H1,
  H2,
  H3,
  H4,
  BodyLarge,
  Body,
  BodySmall,
  Caption,
  SectionHeading,
  SubHeading,
  SectionDescription,
  StatNumber,
  StatLabel,
  PageTitle,
  CardTitle,
  NavLink,
  FormLabel,
};