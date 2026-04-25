"use client"

import { useEffect, useRef } from "react"
import {
  motion,
  useInView,
  useMotionValue,
  useTransform,
  animate,
  useReducedMotion,
} from "framer-motion"
import { cn } from "@/lib/cn"

export type NumericFormat = "raw" | "compact" | "comma" | "percentage" | "duration"

export interface NumericProps {
  value: number
  format?: NumericFormat
  prefix?: string
  suffix?: string
  duration?: number
  /** Animate count-up on first viewport entry (default: true) */
  animateOnView?: boolean
  /** Show a colored delta indicator next to the value */
  delta?: number
  precision?: number
  className?: string
  /** Default true. Set false to use body font instead of mono. */
  mono?: boolean
}

/**
 * Tabular-numeric display with an on-view count-up animation.
 * Respects prefers-reduced-motion (snaps to final value).
 */
export function Numeric({
  value,
  format = "compact",
  prefix,
  suffix,
  duration = 0.9,
  animateOnView = true,
  delta,
  precision,
  className,
  mono = true,
}: NumericProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion || !animateOnView) {
      motionValue.set(value)
      return
    }
    if (!inView) return
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.165, 0.84, 0.44, 1],
    })
    return () => controls.stop()
  }, [value, animateOnView, inView, duration, motionValue, reducedMotion])

  const display = useTransform(motionValue, (v) =>
    formatNumber(v, format, precision),
  )

  return (
    <span
      ref={ref}
      className={cn(
        mono && "font-mono tabular-nums",
        "inline-flex items-baseline",
        className,
      )}
    >
      {prefix && <span className="mr-[0.15em] opacity-80">{prefix}</span>}
      <motion.span>{display}</motion.span>
      {suffix && <span className="ml-[0.15em] opacity-80">{suffix}</span>}
      {delta !== undefined && delta !== 0 && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "ml-2 text-xs font-semibold",
            delta > 0 ? "text-ember" : "text-blood",
          )}
        >
          {delta > 0 ? "+" : ""}
          {formatNumber(delta, format, precision)}
        </motion.span>
      )}
    </span>
  )
}

export function formatNumber(
  value: number,
  format: NumericFormat,
  precision?: number,
): string {
  if (format === "raw") return Math.round(value).toString()
  if (format === "percentage") return `${value.toFixed(precision ?? 1)}%`
  if (format === "comma") return Math.round(value).toLocaleString()
  if (format === "duration") return formatDuration(value)
  const abs = Math.abs(value)
  const p = precision ?? 1
  if (abs >= 1e12) return `${(value / 1e12).toFixed(p)}T`
  if (abs >= 1e9) return `${(value / 1e9).toFixed(p)}B`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(p)}M`
  if (abs >= 1e3) return `${(value / 1e3).toFixed(p)}K`
  return Math.round(value).toString()
}

function formatDuration(msOrSec: number): string {
  const s = msOrSec > 1e8 ? msOrSec / 1000 : msOrSec
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((s % 3600) / 60)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}
