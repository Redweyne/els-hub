"use client"

import { useMemo } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { maxOf, minOf, scaleLinear } from "@/lib/dataviz/scale"
import { cn } from "@/lib/cn"

export interface HistogramProps {
  /** Raw values to bucket. */
  data: ReadonlyArray<number>
  /** Bucket count. Default 12 — fits 4–10 char labels neatly on phones. */
  bins?: number
  width?: number
  height?: number
  /** Optional cutoff line (e.g. minimum-points threshold). */
  cutoff?: number | null
  /** Bar color. */
  color?: string
  /** Color when bars are at-or-above cutoff. */
  colorAboveCutoff?: string
  /** Animation entry delay (s). */
  delay?: number
  className?: string
  ariaLabel?: string
}

/**
 * Distribution histogram with optional cutoff marker. ~1.2kb.
 *
 * Mobile-first: bars use a fixed gap so they read well at 240–360px wide.
 * Animates each bar height in with a tiny stagger.
 */
export function Histogram({
  data,
  bins = 12,
  width = 280,
  height = 64,
  cutoff,
  color = "currentColor",
  colorAboveCutoff,
  delay = 0,
  className,
  ariaLabel,
}: HistogramProps) {
  const reducedMotion = useReducedMotion()

  const { buckets, max, min, span, cutoffX } = useMemo(() => {
    if (data.length === 0) {
      return { buckets: [], max: 0, min: 0, span: 0, cutoffX: null }
    }
    const lo = minOf(data)
    const hi = maxOf(data)
    const sp = Math.max(1, hi - lo)
    const arr = new Array<number>(bins).fill(0)
    for (const v of data) {
      let idx = Math.floor(((v - lo) / sp) * bins)
      if (idx >= bins) idx = bins - 1
      if (idx < 0) idx = 0
      arr[idx]++
    }
    let cx: number | null = null
    if (cutoff != null) {
      const t = scaleLinear(cutoff, lo, hi, 0, 1)
      cx = scaleLinear(t, 0, 1, 0, width)
    }
    return {
      buckets: arr,
      max: maxOf(arr),
      min: lo,
      span: sp,
      cutoffX: cx,
    }
  }, [data, bins, cutoff, width])

  if (buckets.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={cn("inline-block", className)}
        aria-label={ariaLabel ?? "No data"}
      />
    )
  }

  const pad = 4
  const innerW = width - pad * 2
  const innerH = height - pad * 2
  const barWidth = innerW / buckets.length
  const gap = Math.max(1, Math.min(2, barWidth * 0.18))

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("block", className)}
      role="img"
      aria-label={ariaLabel ?? `Distribution of ${data.length} values`}
      style={{ color }}
    >
      {buckets.map((count, i) => {
        const h = max === 0 ? 0 : (count / max) * innerH
        const x = pad + i * barWidth + gap / 2
        const w = barWidth - gap
        const y = pad + innerH - h
        // Determine if this bucket sits at-or-above cutoff (when provided)
        const bucketStart = min + (i / buckets.length) * span
        const bucketEnd = min + ((i + 1) / buckets.length) * span
        const aboveCutoff =
          cutoff != null && bucketEnd >= cutoff
        const fill = aboveCutoff && colorAboveCutoff ? colorAboveCutoff : color
        return (
          <motion.rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={h || 1}
            fill={fill}
            opacity={0.85}
            rx={1}
            initial={
              reducedMotion ? { scaleY: 1 } : { scaleY: 0, originY: 1 }
            }
            animate={{ scaleY: 1 }}
            transition={{
              delay: delay + Math.min(i * 0.018, 0.3),
              duration: reducedMotion ? 0 : 0.45,
              ease: [0.2, 0.8, 0.2, 1],
            }}
            style={{ transformOrigin: `${x + w / 2}px ${pad + innerH}px` }}
            aria-hidden="true"
          >
            {/* Suppress so we don't reference unused variable */}
            <title>{`${Math.round(bucketStart).toLocaleString()}–${Math.round(bucketEnd).toLocaleString()}: ${count}`}</title>
          </motion.rect>
        )
      })}
      {cutoffX != null && (
        <motion.line
          x1={cutoffX}
          x2={cutoffX}
          y1={pad - 1}
          y2={height - pad + 1}
          stroke="currentColor"
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.85}
          initial={reducedMotion ? { opacity: 0.85 } : { opacity: 0 }}
          animate={{ opacity: 0.85 }}
          transition={{ delay: delay + 0.3, duration: 0.4 }}
        />
      )}
    </svg>
  )
}
