"use client"

import { useId } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  maxOf,
  minOf,
  pointsToSmoothPath,
  scaleLinear,
} from "@/lib/dataviz/scale"
import { cn } from "@/lib/cn"

export interface SparkLineProps {
  /** Series of values; nulls are skipped (e.g. missed events). */
  data: ReadonlyArray<number | null>
  width?: number
  height?: number
  /** Stroke color. Pass any CSS color or var. Defaults to currentColor. */
  color?: string
  /** Render an area-fill below the line, alpha-faded. */
  fill?: boolean
  /** Inverted Y (lower is better — useful for ranks). Default false. */
  inverted?: boolean
  /**
   * Highlight the final point with a small dot. Useful when the spark sits
   * inline with a label so the eye knows where "now" is.
   */
  showLastDot?: boolean
  /** Animation entry delay (seconds). */
  delay?: number
  /** Override the SVG aria-label. */
  label?: string
  className?: string
}

/**
 * Minimal SVG spark line. ~1.4kb gzipped, GPU-friendly (only draws and
 * animates `stroke-dashoffset`), and respects reduced-motion.
 *
 * - Empty / single-point data renders as a flat baseline (still visible).
 * - Nulls in the series are dropped before path is computed; the line
 *   simply skips those slots.
 * - Inverted=true is the right call for rank-based series (rank 1 = best).
 */
export function SparkLine({
  data,
  width = 64,
  height = 18,
  color = "currentColor",
  fill = false,
  inverted = false,
  showLastDot = false,
  delay = 0,
  label,
  className,
}: SparkLineProps) {
  const reducedMotion = useReducedMotion()
  const uid = useId().replace(/[:]/g, "")

  const cleaned: number[] = []
  for (const v of data) if (v != null && Number.isFinite(v)) cleaned.push(v)

  const padX = 1.5
  const padY = 2
  const innerW = width - padX * 2
  const innerH = height - padY * 2

  if (cleaned.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn("inline-block align-middle", className)}
        role="img"
        aria-label={label ?? "No data"}
      >
        <line
          x1={padX}
          x2={width - padX}
          y1={height / 2}
          y2={height / 2}
          stroke={color}
          strokeWidth={1}
          strokeLinecap="round"
          opacity={0.25}
          strokeDasharray="2 2"
        />
      </svg>
    )
  }

  const min = minOf(cleaned)
  const max = maxOf(cleaned)

  const points: Array<[number, number]> = cleaned.map((v, i) => {
    const x = scaleLinear(i, 0, Math.max(1, cleaned.length - 1), padX, padX + innerW)
    const t = scaleLinear(v, min, max, 0, 1)
    const yT = inverted ? t : 1 - t
    const y = padY + yT * innerH
    return [x, y]
  })

  // Single-point case: render a centered dot so the row still has a signal.
  if (points.length === 1) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn("inline-block align-middle", className)}
        role="img"
        aria-label={label ?? "Single data point"}
      >
        <circle cx={width / 2} cy={height / 2} r={1.6} fill={color} />
      </svg>
    )
  }

  const path = pointsToSmoothPath(points, 0.55)
  const last = points[points.length - 1]

  // Construct an area path by closing the line back along the bottom.
  const areaPath =
    fill
      ? `${path} L${padX + innerW},${height - padY} L${padX},${height - padY} Z`
      : null

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("inline-block align-middle", className)}
      role="img"
      aria-label={label ?? "Trend"}
      style={{ color }}
    >
      {fill && (
        <defs>
          <linearGradient id={`spark-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && areaPath && (
        <motion.path
          d={areaPath}
          fill={`url(#spark-fill-${uid})`}
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.4 }}
        />
      )}
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={
          reducedMotion
            ? { pathLength: 1 }
            : { pathLength: 0 }
        }
        animate={{ pathLength: 1 }}
        transition={{
          delay,
          duration: 0.7,
          ease: [0.2, 0.8, 0.2, 1],
        }}
      />
      {showLastDot && (
        <motion.circle
          cx={last[0]}
          cy={last[1]}
          r={1.8}
          fill={color}
          initial={reducedMotion ? { scale: 1 } : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.65, duration: 0.3, ease: "backOut" }}
        />
      )}
    </svg>
  )
}
