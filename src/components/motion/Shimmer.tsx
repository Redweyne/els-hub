import { HTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/cn"

export interface ShimmerProps extends HTMLAttributes<HTMLDivElement> {
  /** Stagger delay in ms applied as inline animation-delay. */
  delay?: number
}

/**
 * Ember-tinted shimmering loading placeholder.
 * Uses the `.shimmer` utility defined in globals.css (GPU-accelerated, respects reduced motion).
 * Drop-in replacement for <Skeleton />.
 */
export const Shimmer = forwardRef<HTMLDivElement, ShimmerProps>(
  function Shimmer({ className, delay, style, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn("shimmer rounded-md h-4 w-full", className)}
        style={{
          ...(delay ? { animationDelay: `${delay}ms` } : null),
          ...style,
        }}
        aria-busy="true"
        aria-live="polite"
        {...props}
      />
    )
  },
)
