"use client"

import { useId, useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  pointsToSmoothPath,
  scaleLinear,
  maxOf,
  minOf,
} from "@/lib/dataviz/scale"
import { cn } from "@/lib/cn"

export interface TrendArcProps {
  /** Series of values. Will be smoothed and rendered as an area. */
  data: ReadonlyArray<number>
  /** Width and height in px. */
  width?: number
  height?: number
  /** Stroke + gradient color. */
  color?: string
  /** Animation entry delay (s). */
  delay?: number
  /**
   * If true, the arc adds a slow vertical "breath" — never pans, never
   * triggers reflow — only `transform: translateY` on the path. GPU-only.
   */
  breathe?: boolean
  className?: string
  ariaLabel?: string
}

/**
 * Hero-scale "breathing" trend arc. Single SVG, ~1.2kb.
 *
 * Renders as a softly smoothed line + area gradient. With `breathe`, the
 * whole shape rises and falls 4–6px over a 6s loop — purely GPU `transform`,
 * no layout thrash, no scroll-driven recompute. Used behind the dashboard
 * Faction Pulse hero.
 */
export function TrendArc({
  data,
  width = 360,
  height = 60,
  color = "currentColor",
  delay = 0,
  breathe = true,
  className,
  ariaLabel,
}: TrendArcProps) {
  const reducedMotion = useReducedMotion()
  const uid = useId().replace(/[:]/g, "")

  const { linePath, areaPath } = useMemo(() => {
    if (data.length === 0) return { linePath: "", areaPath: "" }
    const lo = minOf(data)
    const hi = maxOf(data)
    const padX = 0
    const padY = 6
    const innerW = width - padX * 2
    const innerH = height - padY * 2
    const points: Array<[number, number]> = data.map((v, i) => {
      const x = scaleLinear(i, 0, Math.max(1, data.length - 1), padX, padX + innerW)
      const t = scaleLinear(v, lo, hi, 0, 1)
      const y = padY + (1 - t) * innerH
      return [x, y]
    })
    const lp = pointsToSmoothPath(points, 0.6)
    const ap = `${lp} L${width},${height} L0,${height} Z`
    return { linePath: lp, areaPath: ap }
  }, [data, width, height])

  if (data.length === 0 || !linePath) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn("block", className)}
        aria-label={ariaLabel ?? "No trend data"}
      />
    )
  }

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("block", className)}
      role="img"
      aria-label={ariaLabel ?? "Faction pulse trend"}
      style={{ color, willChange: breathe && !reducedMotion ? "transform" : undefined }}
      animate={
        breathe && !reducedMotion
          ? { y: [0, -3, 0, 3, 0] }
          : undefined
      }
      transition={
        breathe && !reducedMotion
          ? { duration: 6.5, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
    >
      <defs>
        <linearGradient id={`arc-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`arc-line-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.6" />
          <stop offset="50%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <motion.path
        d={areaPath}
        fill={`url(#arc-fill-${uid})`}
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.2, duration: 0.6 }}
      />
      <motion.path
        d={linePath}
        fill="none"
        stroke={`url(#arc-line-${uid})`}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay, duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
      />
    </motion.svg>
  )
}
