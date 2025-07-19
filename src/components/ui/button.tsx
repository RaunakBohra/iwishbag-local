import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: [
          'bg-gradient-to-r from-teal-500 to-cyan-500',
          'text-white',
          'hover:from-teal-600 hover:to-cyan-600',
          'font-medium',
          'rounded-lg',
          'px-4 py-2',
          'shadow-sm',
          'transition-colors',
          'duration-200',
        ].join(' '),
        secondary: [
          'bg-white',
          'text-gray-700',
          'border border-gray-200',
          'hover:bg-gray-50',
          'font-medium',
          'rounded-lg',
          'px-4 py-2',
          'shadow-sm',
          'transition-colors',
          'duration-200',
        ].join(' '),
        outline: [
          'bg-transparent',
          'text-teal-600',
          'border border-teal-600',
          'rounded-lg',
          'px-4 py-2',
          'font-medium',
          'transition-colors',
          'duration-200',
          'hover:bg-teal-50',
        ].join(' '),
        ghost: [
          'bg-transparent',
          'text-gray-700',
          'rounded-lg',
          'px-4 py-2',
          'font-medium',
          'transition-colors',
          'duration-200',
          'hover:bg-gray-50',
        ].join(' '),
        destructive: [
          'bg-red-600',
          'text-white',
          'hover:bg-red-700',
          'font-medium',
          'rounded-lg',
          'px-4 py-2',
          'shadow-sm',
          'transition-colors',
          'duration-200',
        ].join(' '),
        link: [
          'text-teal-600',
          'font-medium',
          'bg-transparent',
          'border-none',
          'p-0',
          'transition-colors',
          'duration-200',
          'hover:text-teal-700',
          'hover:underline',
        ].join(' '),
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-11 rounded-lg px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
