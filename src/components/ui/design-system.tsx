// =========================
// DESIGN SYSTEM COMPONENTS
// =========================
//
// This file exports all design system components for easy importing
// and consistent usage across the application.
//
// Usage:
// import { Typography, Spacing, designSystem } from '@/components/ui/design-system';
//
// =========================

export { Typography } from './typography';
export { Spacing } from './spacing';
export { designSystem } from '@/lib/design-system';

// Re-export commonly used design system utilities
export {
  getCardClasses,
  getButtonClasses,
  getInputClasses,
  getBadgeClasses,
  getAlertClasses,
  getStatusColor,
  getPriorityColor,
} from '@/lib/design-system';

// Re-export individual typography components for convenience
export {
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
} from './typography';

// Re-export individual spacing components for convenience
export {
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
} from './spacing';
