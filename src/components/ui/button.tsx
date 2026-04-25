import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-50 active:scale-95 select-none",
  {
    variants: {
      variant: {
        default: "bg-blood text-bone hover:bg-blood/80 active:bg-blood/90 shadow-lg hover:shadow-blood/50",
        destructive:
          "bg-blood/80 text-bone hover:bg-blood active:bg-blood/90 shadow-md hover:shadow-blood/40",
        outline:
          "border border-ash bg-smoke hover:border-ember/50 hover:bg-smoke/80 active:bg-smoke/60 transition-all",
        secondary:
          "bg-smoke/60 text-bone border border-ash hover:bg-smoke/80 active:bg-smoke/40 transition-all",
        ghost: "hover:bg-ash/40 active:bg-ash/60 text-bone transition-colors",
        link: "text-ember underline-offset-4 hover:text-bone active:text-ember/80 transition-colors",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-12 md:min-h-10",
        sm: "h-9 rounded-md px-3 min-h-11",
        lg: "h-11 rounded-md px-8 min-h-12",
        icon: "h-10 w-10 min-h-12 min-w-12",
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
