import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ember focus:ring-offset-2 focus:ring-offset-ink",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-ember text-ink hover:bg-ember/90",
        secondary:
          "border-transparent bg-blood text-bone hover:bg-blood/90",
        destructive:
          "border-blood/40 bg-blood/10 text-blood hover:bg-blood/20",
        outline: "border-ash bg-smoke/40 text-bone hover:bg-smoke/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
