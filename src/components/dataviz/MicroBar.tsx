"use client"

import { motion, useReducedMotion } from "framer-motion"
import { clamp } from "@/lib/dataviz/scale"
import { cn } from "@/lib/cn"

export interface MicroBarProps {
  /** 0..1 fill ratio. Values outside the range are clamped. */
  value: number
  /**
   * Optional benchmark mark (0..1) — drawn as a thin tick on the bar.
   * Useful for "this run vs faction average".
   */
  benchmark?: number | null
  /** Thickness in px. Default 4. */
  thickness?: number
  /** Fill color. Defaults to currentColor. */
  color?: string
  /** Track color (the unfilled portion). */
  track?: string
  /** Animation entry delay. */
  delay?: number
  className?: string
  ariaLabel?: string
}

/**
 * Single horizontal bar with optional benchmark tick. ~0.6kb.
 *
 * Used in:
 *  - Member rows (threshold progress)
 *  - Right Now strip ("X of Y hit threshold")
 *  - Event detail per-member ratio
 */
export function MicroBar({
  value,
  benchmark,
  thickness = 4,
  color = "currentColor",
  track = "rgba(255,255,255,0.08)",
  delay = 0,
  className,
  ariaLabel,
}: MicroBarProps) {
  const reducedMotion = useReducedMotion()
  const v = clamp(value, 0, 1)
  const bm = benchmark != null ? clamp(benchmark, 0, 1) : null

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-full", className)}
      style={{ height: thickness, background: track }}
      role="progressbar"
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ background: color, willChange: "transform" }}
        initial={reducedMotion ? { width: `${v * 100}%` } : { width: 0 }}
        animate={{ width: `${v * 100}%` }}
        transition={{
          delay,
          duration: reducedMotion ? 0 : 0.7,
          ease: [0.2, 0.8, 0.2, 1],
        }}
      />
      {bm != null && (
        <span
          className="absolute top-[-1px] bottom-[-1px] w-px bg-bone/70"
          style={{ left: `${bm * 100}%` }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
