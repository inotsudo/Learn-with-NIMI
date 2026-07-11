import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--leaf-r-sm)] text-sm font-black tracking-[0.01em] ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ds-state-focus)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] hover:-translate-y-0.5 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ds-brand-primary)] text-white shadow-[0_10px_24px_rgba(22,163,74,0.18)] hover:bg-[var(--ds-brand-hover)] border border-white/20 hover:shadow-[0_12px_28px_rgba(22,163,74,0.24)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-[var(--ds-border-brand)]/30 bg-white/90 text-[var(--ds-text-primary)] hover:bg-[var(--ds-brand-soft)] hover:text-[var(--ds-brand-primary)] shadow-sm hover:shadow-[0_8px_20px_rgba(15,23,42,0.06)]",
        secondary:
          "bg-white/90 border border-[var(--ds-border-primary)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-brand-soft)] shadow-sm",
        soft:
          "bg-[var(--ds-brand-soft)] text-[var(--ds-brand-primary)] border border-[var(--ds-border-brand)]/20 shadow-[0_8px_20px_rgba(22,163,74,0.08)] hover:bg-[var(--ds-brand-primary)] hover:text-white",
        elevated:
          "bg-white text-[var(--ds-text-primary)] border border-[var(--ds-border-primary)] shadow-[0_12px_28px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.12)]",
        ghost: "hover:bg-[var(--ds-brand-soft)] hover:text-[var(--ds-brand-primary)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10 rounded-full",
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
