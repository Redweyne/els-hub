"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { cn } from "@/lib/cn"

export interface DeltaArrowProps {
  /** Signed delta. Positive is "improved" by default. */
  delta: number
  /**
   * Inverted means "smaller is better" (e.g. ranks: lower rank = better).
   * In inverted mode, negative delta is shown ember (improvement).
   */
  inverted?: boolean
  /** Show the absolute number alongside the arrow. */
  showValue?: boolean
  /** Size of the icon in px. Default 11. */
  size?: number
  /** Format the number (e.g. comma, percent). Default raw integer. */
  format?: (n: number) => string
  /** Animation entry delay (s). */
  delay?: number
  className?: string
}

/**
 * Signed colored chevron + optional number. ~0.5kb.
 *
 * - delta > 0 (default): ember up
 * - delta < 0: blood-light down
 * - delta == 0: muted dash
 *
 * For ranks pass `inverted` so a smaller rank value reads as ember up.
 */
export function DeltaArrow({
  delta,
  inverted = false,
  showValue = true,
  size = 11,
  format,
  delay = 0,
  className,
}: DeltaArrowProps) {
  const reducedMotion = useReducedMotion()
  const isUp = inverted ? delta < 0 : delta > 0
  const isFlat = delta === 0

  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown
  const tone = isFlat
    ? "text-bone/45"
    : isUp
      ? "text-ember"
      : "text-blood-light"

  const value = Math.abs(delta)
  const formatted = format ? format(value) : value.toString()

  return (
    <motion.span
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: "easeOut" }}
      className={cn(
        "inline-flex items-center gap-0.5 font-mono font-bold tabular-nums",
        tone,
        className,
      )}
      aria-label={
        isFlat ? "no change" : `${isUp ? "up" : "down"} ${formatted}`
      }
    >
      <Icon size={size} aria-hidden="true" strokeWidth={2.5} />
      {showValue && !isFlat && (
        <span style={{ fontSize: size }} className="leading-none">
          {formatted}
        </span>
      )}
    </motion.span>
  )
}
