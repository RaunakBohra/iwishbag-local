import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: [
          "bg-[linear-gradient(to_right,#00c4d6,#00e5d4,#00c4d6)]",
          "bg-[length:200%_auto]",
          "text-white",
          "font-semibold",
          "rounded-[10px]",
          "px-[30px] py-[14px]",
          "shadow-[0_4px_15px_rgba(0,229,212,0.3)]",
          "transition-all",
          "duration-200",
          "ease-in-out",
          "hover:bg-[position:right_center]",
          "hover:scale-105",
          "focus:bg-[position:right_center]",
          "focus:scale-105"
        ].join(' '),
        secondary: [
          "bg-[linear-gradient(to_right,#e0fbfc,#b2f4fa,#e0fbfc)]",
          "bg-[length:200%_auto]",
          "text-[#052a2e]",
          "font-semibold",
          "rounded-[10px]",
          "px-[30px] py-[14px]",
          "shadow-[0_2px_8px_rgba(0,229,212,0.08)]",
          "transition-all",
          "duration-200",
          "ease-in-out",
          "hover:bg-[position:right_center]",
          "hover:scale-105",
          "focus:bg-[position:right_center]",
          "focus:scale-105"
        ].join(' '),
        outline: [
          "bg-transparent",
          "text-[#00c4d6]",
          "border-2 border-transparent",
          "rounded-[10px]",
          "px-[30px] py-[14px]",
          "font-semibold",
          "bg-[linear-gradient(white,white),linear-gradient(to_right,#00c4d6,#00e5d4,#00c4d6)]",
          "bg-origin-border bg-clip-padding border-box",
          "transition-all",
          "duration-200",
          "ease-in-out",
          "hover:scale-105",
          "hover:border-[#00e5d4]",
          "focus:scale-105",
          "focus:border-[#00e5d4]"
        ].join(' '),
        ghost: [
          "bg-[rgba(255,255,255,0.12)]",
          "border border-[#b2f4fa]",
          "text-[#00c4d6]",
          "rounded-[10px]",
          "px-[30px] py-[14px]",
          "font-semibold",
          "backdrop-blur-[10px]",
          "transition-all",
          "duration-200",
          "ease-in-out",
          "hover:scale-105",
          "hover:bg-[rgba(255,255,255,0.18)]",
          "focus:scale-105"
        ].join(' '),
        destructive: [
          "bg-[linear-gradient(to_right,#ff5f6d,#ffc371,#ff5f6d)]",
          "bg-[length:200%_auto]",
          "text-black",
          "font-semibold",
          "rounded-[10px]",
          "px-[30px] py-[14px]",
          "shadow-[0_4px_15px_rgba(255,95,109,0.15)]",
          "transition-all",
          "duration-200",
          "ease-in-out",
          "hover:bg-[position:right_center]",
          "hover:scale-105",
          "focus:bg-[position:right_center]",
          "focus:scale-105"
        ].join(' '),
        link: [
          "text-[#0074d9]",
          "font-semibold",
          "bg-none",
          "border-none",
          "p-0",
          "transition-all",
          "duration-200",
          "ease-in-out",
          "hover:underline",
          "hover:scale-105",
          "focus:underline",
          "focus:scale-105"
        ].join(' '),
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
