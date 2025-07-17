import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-blue-100 text-blue-800',
        secondary: 'border-transparent bg-gray-100 text-gray-800',
        outline: 'bg-white text-gray-800 border',
        destructive: 'border-transparent bg-red-100 text-red-800',
        success: 'border-transparent bg-green-100 text-green-800',
        warning: 'border-transparent bg-yellow-100 text-yellow-800',
        info: 'border-transparent bg-sky-100 text-sky-800',
        purple: 'border-transparent bg-purple-100 text-purple-800',
        pink: 'border-transparent bg-pink-100 text-pink-800',
        indigo: 'border-transparent bg-indigo-100 text-indigo-800',
        emerald: 'border-transparent bg-emerald-100 text-emerald-800',
        amber: 'border-transparent bg-amber-100 text-amber-800',
        rose: 'border-transparent bg-rose-100 text-rose-800',
        violet: 'border-transparent bg-violet-100 text-violet-800',
        cyan: 'border-transparent bg-cyan-100 text-cyan-800',
        lime: 'border-transparent bg-lime-100 text-lime-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/**
 * Supported badge color variants (matches colorOptions in StatusManagement):
 * - default (blue)
 * - secondary (gray)
 * - outline (border only)
 * - destructive (red)
 * - success (green)
 * - warning (yellow)
 * - info (sky blue)
 * - purple
 * - pink
 * - indigo
 * - emerald
 * - amber
 * - rose
 * - violet
 * - cyan
 * - lime
 */

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  },
);
Badge.displayName = 'Badge';

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
