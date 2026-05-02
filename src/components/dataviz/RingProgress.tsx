"use client"

import { motion, useReducedMotion } from "framer-motion"
import { clamp } from "@/lib/dataviz/scale"
import { cn } from "@/lib/cn"

export interface RingProgressProps {
  /** 0..1 fill ratio (clamped). */
  value: number
  /** Outer diameter in px. */
  size?: number
  /** Stroke width in px. */
  strokeWidth?: number
  /** Track stroke color. */
  trackColor?: string
  /** Progress stroke color. Defaults to currentColor. */
  color?: string
  /** Center label (numeric or text). */
  label?: React.ReactNode
  /** Optional small caption beneath the label. */
  caption?: React.ReactNode
  /** Entry delay (s). */
  delay?: number
  className?: string
  ariaLabel?: string
}

/**
 * Circular ring progress indicator. ~0.9kb.
 *
 * Used for:
 *  - Threshold completion ("82% qualified")
 *  - Streak completion ("3/5 day streak")
 *  - Personal best % of faction average
 */
export function RingProgress({
  value,
  size = 56,
  strokeWidth = 4,
  trackColor = "rgba(255,255,255,0.1)",
  color = "currentColor",
  label,
  caption,
  delay = 0,
  className,
  ariaLabel,
}: RingProgressProps) {
  const reducedMotion = useReducedMotion()
  const v = clamp(value, 0, 1)
  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const filled = circumference * v

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          initial={
            reducedMotion
              ? { strokeDasharray: `${filled} ${circumference}` }
              : { strokeDasharray: `0 ${circumference}` }
          }
          animate={{ strokeDasharray: `${filled} ${circumference}` }}
          transition={{
            delay,
            duration: reducedMotion ? 0 : 0.9,
            ease: [0.2, 0.8, 0.2, 1],
          }}
          style={{ willChange: reducedMotion ? undefined : "stroke-dasharray" }}
        />
      </svg>
      {(label || caption) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          {label && (
            <span className="font-mono font-bold tabular-nums text-bone leading-none">
              {label}
            </span>
          )}
          {caption && (
            <span className="text-[8px] uppercase tracking-[0.18em] text-bone/45 mt-0.5 leading-none">
              {caption}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
