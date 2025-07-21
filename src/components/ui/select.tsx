import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 md:text-sm transition-colors [&>span]:line-clamp-1',
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-gray-500" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => {
  // Debug logging, CSS injection, and event handling
  React.useEffect(() => {
    console.log('🔍 SelectContent rendered with scrollable viewport - cache cleared!');
    
    // Fallback: Inject CSS directly if Tailwind classes don't work
    const existingStyle = document.getElementById('select-scrollable-fallback');
    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = 'select-scrollable-fallback';
      style.textContent = `
        [data-radix-select-content] [data-radix-select-viewport] {
          max-height: 300px !important;
          overflow-y: auto !important;
          scrollbar-width: thin;
        }
        [data-radix-select-content] [data-radix-select-viewport]::-webkit-scrollbar {
          width: 8px;
        }
        [data-radix-select-content] [data-radix-select-viewport]::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        [data-radix-select-content] [data-radix-select-viewport]::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }
        [data-radix-select-content] [data-radix-select-viewport]::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        /* Prevent number inputs from interfering with dropdown scroll */
        input[type="number"] {
          scroll-behavior: auto !important;
        }
        input[type="number"]:focus {
          scroll-behavior: auto !important;
        }
      `;
      document.head.appendChild(style);
      console.log('💉 Fallback CSS injected for select scrolling');
    }

    // Enhanced event handling to prevent number input interference
    const handleDropdownWheel = (e: WheelEvent) => {
      const target = e.target as Element;
      const isInDropdown = target.closest('[data-radix-select-content]') || target.closest('[data-radix-select-viewport]');
      const isNumberInput = target instanceof HTMLInputElement && target.type === 'number';
      
      if (isInDropdown) {
        // Allow scrolling in dropdown, prevent propagation to other elements
        e.stopPropagation();
        console.log('🎯 Wheel event captured for dropdown scrolling');
      } else if (isNumberInput) {
        // Block wheel events on number inputs completely
        e.preventDefault();
        e.stopPropagation();
        console.log('🚫 Wheel event blocked on number input');
      }
    };

    // Add event listener with capture: true to intercept events early
    document.addEventListener('wheel', handleDropdownWheel, { passive: false, capture: true });
    
    return () => {
      document.removeEventListener('wheel', handleDropdownWheel, { capture: true } as any);
    };
  }, []);
  
  return (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        'relative z-50 min-w-[8rem] max-h-none rounded-lg border border-gray-200 bg-white text-gray-900 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        className,
      )}
      position={position}
      {...props}
    >
      <SelectPrimitive.Viewport
        className={cn(
          'p-1 max-h-[300px] !overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full',
          position === 'popper' &&
            'w-full min-w-[var(--radix-select-trigger-width)]',
        )}
        style={{ maxHeight: '300px', overflowY: 'auto' }}
        data-scrollable="true"
      >
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn('py-1.5 pl-8 pr-2 text-sm font-medium text-gray-900', className)}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-teal-50 focus:text-teal-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-gray-900',
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-gray-200', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
