import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-blue-200 bg-blue-50 text-blue-700',
        secondary: 'border-gray-200 bg-gray-50 text-gray-700',
        outline: 'bg-white text-gray-700 border-gray-200',
        destructive: 'border-red-200 bg-red-50 text-red-700',
        success: 'border-green-200 bg-green-50 text-green-700',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-700',
        info: 'border-sky-200 bg-sky-50 text-sky-700',
        purple: 'border-purple-200 bg-purple-50 text-purple-700',
        pink: 'border-pink-200 bg-pink-50 text-pink-700',
        indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700',
        rose: 'border-rose-200 bg-rose-50 text-rose-700',
        violet: 'border-violet-200 bg-violet-50 text-violet-700',
        cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
        lime: 'border-lime-200 bg-lime-50 text-lime-700',
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
